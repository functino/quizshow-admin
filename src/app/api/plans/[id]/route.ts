import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  await query(
    'UPDATE plans SET name = $1, amount = $2, stripe_id = $3, paddle_id = $4, active = $5, data = $6, updated_at = NOW() WHERE id = $7',
    [body.name, body.amount, body.stripe_id, body.paddle_id, body.active, JSON.stringify(body.data), id],
  );

  return NextResponse.json({ ok: true });
}
