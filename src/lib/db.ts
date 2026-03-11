import { Pool } from 'pg';

const port = parseInt(process.env.DATABASE_PORT || '5432');

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port,
  database: process.env.DATABASE_NAME || 'quizshow-io',
  user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'ageier',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: port === 25060 ? { rejectUnauthorized: false } : false,
  max: 10,
});

export async function query(text: string, params?: unknown[]) {
  const res = await pool.query(text, params);
  return res.rows;
}
