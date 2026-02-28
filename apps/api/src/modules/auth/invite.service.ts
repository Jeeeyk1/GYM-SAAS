import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Invite, InviteType } from '../../database/entities/invite.entity';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    private readonly config: ConfigService,
  ) {}

  async create(params: {
    clientId: string;
    identityId: string;
    role: string;
    type: InviteType;
    invitedBy: string | null;
  }): Promise<Invite> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.config.get<number>('app.inviteExpiryHours', 72);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const invite = this.inviteRepo.create({
      token,
      clientId: params.clientId,
      identityId: params.identityId,
      role: params.role,
      type: params.type,
      invitedBy: params.invitedBy,
      status: 'pending',
      expiresAt,
    });

    return this.inviteRepo.save(invite);
  }

  async validate(token: string): Promise<Invite> {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ['identity', 'client'],
    });

    if (!invite) throw new NotFoundException('Invite not found or already used');
    if (invite.status === 'accepted') throw new BadRequestException('Invite already accepted');
    if (invite.status === 'expired' || invite.expiresAt < new Date()) {
      if (invite.status !== 'expired') {
        await this.inviteRepo.update(invite.id, { status: 'expired' });
      }
      throw new BadRequestException('Invite has expired');
    }

    return invite;
  }

  async accept(token: string): Promise<Invite> {
    const invite = await this.validate(token);
    await this.inviteRepo.update(invite.id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });
    return { ...invite, status: 'accepted' };
  }
}