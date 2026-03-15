import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureResolverService } from './feature-resolver.service';
import { ClientFeature } from '../../database/entities/client-feature.entity';
import { ClientFeatureOverride } from '../../database/entities/client-feature-override.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeClientFeature = (
  key: string,
  isEnabled: boolean,
  defaultConfig: Record<string, unknown> = {},
  featureId = `feat-${key}`,
): Partial<ClientFeature> => ({
  clientId: 'client-1',
  featureId,
  isEnabled,
  featureDefinition: {
    id: featureId,
    key,
    defaultConfig,
  } as any,
});

const makeOverride = (
  featureId: string,
  config: Record<string, unknown>,
): Partial<ClientFeatureOverride> => ({
  clientId: 'client-1',
  featureId,
  config,
});

describe('FeatureResolverService', () => {
  let service: FeatureResolverService;
  let clientFeatureRepo: { find: jest.Mock };
  let overrideRepo: { find: jest.Mock };

  beforeEach(async () => {
    clientFeatureRepo = { find: jest.fn() };
    overrideRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureResolverService,
        { provide: getRepositoryToken(ClientFeature), useValue: clientFeatureRepo },
        { provide: getRepositoryToken(ClientFeatureOverride), useValue: overrideRepo },
      ],
    }).compile();

    service = module.get(FeatureResolverService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── resolve() — cache miss ────────────────────────────────────────────────

  it('queries the DB on the first call (cache miss)', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.basic', true, { duplicate_window_minutes: 60 }),
    ]);
    overrideRepo.find.mockResolvedValue([]);

    const result = await service.resolve('client-1');

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(1);
    expect(result.has('checkin.basic')).toBe(true);
    expect(result.get('checkin.basic')?.isEnabled).toBe(true);
  });

  // ─── resolve() — cache hit ─────────────────────────────────────────────────

  it('returns cached result on second call within TTL (no DB query)', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.basic', true),
    ]);
    overrideRepo.find.mockResolvedValue([]);

    await service.resolve('client-1'); // populates cache
    await service.resolve('client-1'); // should hit cache

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(1);
  });

  // ─── resolve() — expired cache ────────────────────────────────────────────

  it('re-queries the DB after TTL expires', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.basic', true),
    ]);
    overrideRepo.find.mockResolvedValue([]);

    // Date.now() call sequence:
    // 1st resolve() — cache is empty, short-circuit skips TTL check:
    //   → called ONCE for cachedAt write → return T
    // 2nd resolve() — cache exists:
    //   → called ONCE for TTL check (Date.now() - T = 61_000 > 60_000 → expired)
    //   → called ONCE for new cachedAt write
    const T = 1_000_000_000_000;
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(T)           // 1st resolve: sets cachedAt = T
      .mockReturnValueOnce(T + 61_000)  // 2nd resolve: TTL check → expired
      .mockReturnValueOnce(T + 61_000); // 2nd resolve: sets new cachedAt

    await service.resolve('client-1'); // fills cache with T
    await service.resolve('client-1'); // TTL check sees 61s elapsed → cache miss → re-query

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(2);
  });

  // ─── resolve() — config merge ──────────────────────────────────────────────

  it('merges defaultConfig with override config (override wins)', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature(
        'checkin.loyalty_points',
        true,
        { points_per_visit: 10, bonus_threshold: 5 },
        'feat-loyalty',
      ),
    ]);
    overrideRepo.find.mockResolvedValue([
      makeOverride('feat-loyalty', { points_per_visit: 20 }),
    ]);

    const result = await service.resolve('client-1');
    const loyalty = result.get('checkin.loyalty_points');

    expect(loyalty?.isEnabled).toBe(true);
    expect(loyalty?.config['points_per_visit']).toBe(20); // override wins
    expect(loyalty?.config['bonus_threshold']).toBe(5);   // default preserved
  });

  it('uses empty config when no override exists', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.basic', true, { duplicate_window_minutes: 60 }),
    ]);
    overrideRepo.find.mockResolvedValue([]); // no overrides

    const result = await service.resolve('client-1');
    const basic = result.get('checkin.basic');

    expect(basic?.config['duplicate_window_minutes']).toBe(60);
  });

  it('returns disabled status for features where isEnabled is false', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.welcome_message', false),
    ]);
    overrideRepo.find.mockResolvedValue([]);

    const result = await service.resolve('client-1');
    expect(result.get('checkin.welcome_message')?.isEnabled).toBe(false);
  });

  it('returns an empty Map when the gym has no feature rows', async () => {
    clientFeatureRepo.find.mockResolvedValue([]);
    overrideRepo.find.mockResolvedValue([]);

    const result = await service.resolve('client-1');
    expect(result.size).toBe(0);
  });

  // ─── invalidate() ─────────────────────────────────────────────────────────

  it('forces a DB re-query after invalidate()', async () => {
    clientFeatureRepo.find.mockResolvedValue([
      makeClientFeature('checkin.basic', true),
    ]);
    overrideRepo.find.mockResolvedValue([]);

    await service.resolve('client-1'); // fills cache
    service.invalidate('client-1');    // removes entry
    await service.resolve('client-1'); // must re-query

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(2);
  });

  it('invalidate() is a no-op for a clientId that was never resolved', () => {
    expect(() => service.invalidate('unknown-client')).not.toThrow();
  });

  it('cache is isolated per clientId', async () => {
    clientFeatureRepo.find.mockResolvedValue([]);
    overrideRepo.find.mockResolvedValue([]);

    await service.resolve('client-1');
    await service.resolve('client-2');

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(2);

    // Second call to client-1 uses cache; client-2 uses its own cache
    await service.resolve('client-1');
    await service.resolve('client-2');

    expect(clientFeatureRepo.find).toHaveBeenCalledTimes(2);
  });
});
