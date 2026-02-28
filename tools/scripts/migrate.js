#!/usr/bin/env node
/**
 * Run from monorepo root:
 *   pnpm migrate:up
 *   pnpm migrate:down
 *   pnpm migrate:create --name add_something
 *   pnpm migrate:status
 */
const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];
const extraArgs = process.argv.slice(3).join(' ');

if (!command) {
  console.error('Usage: node tools/scripts/migrate.js <up|down|create|status> [args]');
  process.exit(1);
}


const cmd = `pnpm exec node-pg-migrate ${command} --config-file database.js --migration-file-language sql ${extraArgs}`;
console.log(`Running: ${cmd}\n`);

try {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: path.resolve(__dirname, '../..'),
  });
} catch (err) {
  process.exit(1);
}