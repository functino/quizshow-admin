import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await query(`
    SELECT u.id, u.name, u.email, u.created_at, u.confirmed_at, u.last_active_at,
           u.plan, u.language,
           COUNT(q.id) as quiz_count
    FROM users u
    LEFT JOIN quizzes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY u.id
  `);

  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const ts = (d: unknown) => d ? Math.floor(new Date(d as string).getTime() / 1000) : '';
  const lines = ['user_id,name,email,created_at,confirmed_at,last_active_at,plan,quiz_count,language'];
  for (const u of users) {
    lines.push([u.id, esc(u.name || u.email), esc(u.email), ts(u.created_at), ts(u.confirmed_at), ts(u.last_active_at), esc(u.plan), u.quiz_count, esc(u.language)].join(','));
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="users.csv"',
    },
  });
}
