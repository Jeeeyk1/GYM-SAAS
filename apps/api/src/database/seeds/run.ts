import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSeeds() {
  const client = new Client({ connectionString: "postgresql://gymsaas:gymsaas_secret@localhost:5432/gymsaas" });

  try {
    await client.connect();
    console.log('Connected to database');

    const seedsDir = path.join(__dirname);
    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // runs in filename order: 001_, 002_, etc.

    for (const file of seedFiles) {
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`▶ Running seed: ${file}`);
      await client.query(sql);
      console.log(`✅ Completed: ${file}`);
    }

    console.log('\n All seeds completed successfully');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeeds();