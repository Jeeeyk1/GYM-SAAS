/**
 * Seed: Platform Admin
 *
 * Creates the first platform super-admin identity from environment variables.
 * Idempotent — skips if any platform_admin already exists.
 *
 * Usage:
 *   pnpm seed:admin
 *
 * Required env vars:
 *   PLATFORM_ADMIN_EMAIL
 *   PLATFORM_ADMIN_PASSWORD
 */

import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedPlatformAdmin() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing required env vars: PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('PLATFORM_ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://gymsaas:gymsaas_secret@localhost:5432/gymsaas';

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Idempotency check — one platform_admin is enough
    const existing = await client.query(
      `SELECT id FROM identities WHERE account_type = 'PLATFORM_ADMIN' LIMIT 1`,
    );

    if (existing.rows.length > 0) {
      console.log('Platform admin already exists — skipping.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO identities
         (email, password_hash, provider, is_verified, account_type, platform_role)
       VALUES ($1, $2, 'local', TRUE, 'PLATFORM_ADMIN', 'gym_admin')`,
      [email, passwordHash],
    );

    console.log(`✅ Platform admin created: ${email}`);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedPlatformAdmin();
