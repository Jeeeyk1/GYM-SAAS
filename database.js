const path = require('path');
const { dirname } = require('path');

require('dotenv').config();

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'pgmigrations',  // tracks applied migrations
  dir: path.resolve(__dirname, 'apps/api/src/database/migrations'), direction: 'up',
  count: Infinity,
  ignorePattern: '(^\\.|.*\\.spec\\.ts$)',
  decamelize: true,
  checkOrder: false,
};