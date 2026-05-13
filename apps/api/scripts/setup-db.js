import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { env } from '../src/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', 'db', 'schema.sql');

const sql = await readFile(schemaPath, 'utf8');
const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();
await client.query(sql);
await client.end();
console.log('Database ready.');
