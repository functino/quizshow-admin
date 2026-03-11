import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

async function fetchPaddleSubscriptions(): Promise<{ user_email: string; state: string; last_payment?: { date: string } }[]> {
  const vendorId = process.env.PADDLE_VENDOR_ID;
  const vendorAuthCode = process.env.PADDLE_VENDOR_AUTH_CODE;
  if (!vendorId || !vendorAuthCode) return [];
  const allSubs: { user_email: string; state: string; last_payment?: { date: string } }[] = [];
  let page = 1;
  while (true) {
    const res = await fetch('https://vendors.paddle.com/api/2.0/subscription/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, vendor_auth_code: vendorAuthCode, results_per_page: 200, page }),
      next: { revalidate: 0 },
    });
    const data = await res.json();
    if (!data.success || !data.response?.length) break;
    allSubs.push(...data.response);
    if (data.response.length < 200) break;
    page++;
  }
  return allSubs;
}

export default async function SubscriptionsPage() {
  const p = {
    activeSubscriptions: query(`
      SELECT s.id, s.created_at, s.stripe_id as sub_stripe_id, s.paddle_id as sub_paddle_id,
             u.email, u.id as user_id, u.last_active_at,
             p.name as plan_name, p.stripe_id as plan_stripe_id, p.amount
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.canceled_at IS NULL
      ORDER BY s.created_at DESC
    `),
    canceledSubscriptions: query(`
      SELECT s.id, s.created_at, s.canceled_at, s.cancel_reason,
             s.stripe_id as sub_stripe_id, s.paddle_id as sub_paddle_id,
             u.email, u.id as user_id, u.last_active_at,
             p.name as plan_name, p.stripe_id as plan_stripe_id, p.amount
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.canceled_at IS NOT NULL
      ORDER BY s.canceled_at DESC
    `),
    mrr: query(`
      SELECT COALESCE(SUM(p.amount), 0) / 100 as mrr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.canceled_at IS NULL
    `).then(r => r[0].mrr),
    paddleApiSubs: fetchPaddleSubscriptions(),
  };

  const activeSubscriptions = await p.activeSubscriptions;
  const canceledSubscriptions = await p.canceledSubscriptions;
  const mrr = await p.mrr;
  const paddleApiSubs = await p.paddleApiSubs;
  const paddleApiEmails = new Set(paddleApiSubs.map(s => s.user_email));

  // Local paddle subscription emails
  const localPaddleEmails = new Set(
    activeSubscriptions
      .filter((s: Record<string, unknown>) => s.sub_paddle_id)
      .map((s: Record<string, unknown>) => s.email as string)
  );

  // Broken = symmetric difference (in local but not paddle, or in paddle but not local)
  const brokenEmails = [
    ...[...localPaddleEmails].filter(e => !paddleApiEmails.has(e)),
    ...[...paddleApiEmails].filter(e => !localPaddleEmails.has(e)),
  ];

  // Past-due from Paddle API
  const pastDuePaddleSubs = paddleApiSubs.filter(s => s.state === 'past_due');
  const pastDueEmails = pastDuePaddleSubs.map(s => s.user_email);
  const pastDueUsers = pastDueEmails.length > 0 ? await query(`
    SELECT u.id, u.email, u.last_active_at
    FROM users u
    WHERE u.email = ANY($1)
  `, [pastDueEmails]) : [];
  const pastDueData = pastDueUsers.map((u: Record<string, unknown>) => {
    const paddleSub = pastDuePaddleSubs.find(s => s.user_email === u.email);
    return { ...u, last_payment_date: paddleSub?.last_payment?.date };
  });

  const renderRow = (sub: Record<string, unknown>, showCanceled = false) => {
    const provider = sub.sub_paddle_id ? 'paddle' : 'stripe';
    const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);

    return (
      <TableRow key={sub.id as number}>
        <TableCell>
          <Link href={`/users/${sub.user_id}`} className="text-primary hover:underline">{sub.email as string}</Link>
        </TableCell>
        <TableCell>
          {sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong>
          <span className="text-muted-foreground ml-1">({provider})</span>
        </TableCell>
        <TableCell>{formatDate(sub.created_at as string)}</TableCell>
        <TableCell>{formatDate(sub.last_active_at as string)}</TableCell>
        <TableCell>${revenue}</TableCell>
        {showCanceled && (
          <TableCell>
            {formatDate(sub.canceled_at as string)}
            {sub.cancel_reason != null && <div className="text-xs text-muted-foreground mt-1">{sub.cancel_reason as string}</div>}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Subscriptions</h1>
        <Badge variant="secondary">MRR: ${mrr}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active ({activeSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSubscriptions.map((sub) => renderRow(sub))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {brokenEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Broken Subscriptions ({brokenEmails.length})</CardTitle>
            <CardDescription>Mismatch between local DB and Paddle API (in one but not the other)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {brokenEmails.map((email) => (
                <div key={email} className="text-sm">{email}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pastDueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Due ({pastDueData.length})</CardTitle>
            <CardDescription>Paddle subscriptions in past_due state</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Last Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastDueData.map((u: Record<string, unknown>) => (
                  <TableRow key={u.id as number}>
                    <TableCell>
                      <Link href={`/users/${u.id}`} className="text-primary hover:underline">{u.email as string}</Link>
                    </TableCell>
                    <TableCell>{formatDate(u.last_active_at as string)}</TableCell>
                    <TableCell>{u.last_payment_date ? formatDate(u.last_payment_date as string) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Canceled ({canceledSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Canceled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {canceledSubscriptions.map((sub) => renderRow(sub, true))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
