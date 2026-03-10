import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [body.name, id]);
  return NextResponse.json({ ok: true });
}
