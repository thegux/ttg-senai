import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

function optional(key) {
  const value = process.env[key];
  if (!value) console.warn(`[env] ${key} is not set — features that need it will fail until you fill it in .env`);
  return value ?? '';
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  API_PORT: Number(process.env.API_PORT ?? 3001),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3001/google/callback',

  OPENAI_API_KEY: optional('OPENAI_API_KEY'),
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
};
