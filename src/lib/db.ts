import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'quizshow-io',
  user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'ageier',
  password: process.env.DATABASE_PASSWORD || '',
  max: 10,
});

export async function query(text: string, params?: unknown[]) {
  const res = await pool.query(text, params);
  return res.rows;
}

export default pool;
