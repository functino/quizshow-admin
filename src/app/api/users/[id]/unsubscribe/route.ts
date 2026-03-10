import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query(
    "UPDATE subscriptions SET canceled_at = NOW(), cancel_reason = 'via admin' WHERE user_id = $1 AND canceled_at IS NULL",
    [id],
  );
  return NextResponse.json({ ok: true });
}
