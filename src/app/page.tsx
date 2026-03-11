import { query } from '@/lib/db';
import { numberWithDelimiter } from '@/lib/format';
import StatCard from '@/components/StatCard';
import DashboardCharts from './DashboardCharts';
import DashboardTraffic from './DashboardTraffic';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

async function count(sql: string) {
  const [{ count }] = await query(sql);
  return Number(count);
}

export default async function DashboardPage() {
  // Fire all queries in parallel
  const p = {
    userCount:       count('SELECT COUNT(*) as count FROM users'),
    confirmedCount:  count('SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL'),
    todayUsers:      count("SELECT COUNT(*) as count FROM users WHERE created_at > CURRENT_DATE"),
    todayConfirmed:  count("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > CURRENT_DATE"),
    monthUsers:      count("SELECT COUNT(*) as count FROM users WHERE created_at > DATE_TRUNC('month', CURRENT_DATE)"),
    monthConfirmed:  count("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > DATE_TRUNC('month', CURRENT_DATE)"),
    mailsAllowed:    count("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND mails_allowed = true AND created_at > '2020-04-23'"),
    mailsTotal:      count("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > '2020-04-23'"),
    quizCount:       count('SELECT COUNT(*) as count FROM quizzes'),
    quizToday:       count("SELECT COUNT(*) as count FROM quizzes WHERE created_at > CURRENT_DATE"),
    activeQuiz7d:    count("SELECT COUNT(*) as count FROM quizzes WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '7 day'"),
    activeUsers7d:   count("SELECT COUNT(*) as count FROM users WHERE last_active_at > CURRENT_TIMESTAMP - INTERVAL '7 day'"),
    activeQuiz3d:    count("SELECT COUNT(*) as count FROM quizzes WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '3 day'"),
    activeUsers3d:   count("SELECT COUNT(*) as count FROM users WHERE last_active_at > CURRENT_TIMESTAMP - INTERVAL '3 day'"),
    quizByMonth:     query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM quizzes GROUP BY month ORDER BY month"),
    userByMonth:     query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM users GROUP BY month ORDER BY month"),
    confirmedByMonth: query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL GROUP BY month ORDER BY month"),
    activeSubscriptions: query(`
      SELECT s.id, s.created_at, s.stripe_id as sub_stripe_id, s.paddle_id as sub_paddle_id,
             u.email, u.id as user_id, u.last_active_at,
             p.name as plan_name, p.stripe_id as plan_stripe_id, p.amount
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.canceled_at IS NULL
      ORDER BY s.created_at DESC
      LIMIT 5
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
      LIMIT 5
    `),
    mrr: query(`
      SELECT COALESCE(SUM(p.amount), 0) / 100 as mrr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.canceled_at IS NULL
    `).then(r => r[0].mrr),
    activePlans: query(`
      SELECT p.name, p.stripe_id, COUNT(s.id) as active_count
      FROM plans p
      JOIN subscriptions s ON s.plan_id = p.id
      WHERE s.canceled_at IS NULL
      GROUP BY p.id, p.name, p.stripe_id
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC
    `),
  };

  // Await all results
  const userCount = await p.userCount;
  const confirmedCount = await p.confirmedCount;
  const todayUsers = await p.todayUsers;
  const todayConfirmed = await p.todayConfirmed;
  const monthUsers = await p.monthUsers;
  const monthConfirmed = await p.monthConfirmed;
  const mailsAllowed = await p.mailsAllowed;
  const mailsTotal = await p.mailsTotal;
  const quizCount = await p.quizCount;
  const quizToday = await p.quizToday;
  const activeQuiz7d = await p.activeQuiz7d;
  const activeUsers7d = await p.activeUsers7d;
  const activeQuiz3d = await p.activeQuiz3d;
  const activeUsers3d = await p.activeUsers3d;
  const quizByMonth = await p.quizByMonth;
  const userByMonth = await p.userByMonth;
  const confirmedByMonth = await p.confirmedByMonth;
  const activeSubscriptions = await p.activeSubscriptions;
  const canceledSubscriptions = await p.canceledSubscriptions;
  const mrr = await p.mrr;
  const activePlans = await p.activePlans;

  const confirmedPct = userCount > 0 ? Math.round(Number(confirmedCount) * 100 / Number(userCount)) : 0;
  const monthConfPct = Number(monthUsers) > 0 ? Math.round(Number(monthConfirmed) * 100 / Number(monthUsers)) : 0;
  const mailsPct = Number(mailsTotal) > 0 ? Math.round(Number(mailsAllowed) * 100 / Number(mailsTotal)) : 0;

  const chartData = {
    quizByMonth: quizByMonth.map((r: { month: Date; count: string }) => ({ month: new Date(r.month).getTime(), count: Number(r.count) })),
    userByMonth: userByMonth.map((r: { month: Date; count: string }) => ({ month: new Date(r.month).getTime(), count: Number(r.count) })),
    confirmedByMonth: confirmedByMonth.map((r: { month: Date; count: string }) => ({ month: new Date(r.month).getTime(), count: Number(r.count) })),
  };

  return (
    <div className="space-y-8">
      {/* Users */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={numberWithDelimiter(Number(userCount))} sub={`${numberWithDelimiter(Number(confirmedCount))} confirmed (${confirmedPct}%)`} />
          <StatCard label="Today" value={Number(todayUsers)} sub={`${todayConfirmed} confirmed`} />
          <StatCard label="This Month" value={Number(monthUsers)} sub={`${monthConfirmed} confirmed (${monthConfPct}%)`} />
          <StatCard label="Mails Allowed" value={`${mailsPct}%`} sub={`${numberWithDelimiter(Number(mailsAllowed))} of ${numberWithDelimiter(Number(mailsTotal))}`} />
        </div>
      </section>

      {/* Quizzes */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quizzes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={numberWithDelimiter(Number(quizCount))} sub={`Today: ${quizToday}`} />
          <StatCard label="Active (7d)" value={Number(activeQuiz7d)} sub={`${activeUsers7d} users`} />
          <StatCard label="Active (3d)" value={Number(activeQuiz3d)} sub={`${activeUsers3d} users`} />
        </div>
      </section>

      {/* Traffic & Avatars (from Plausible) */}
      <DashboardTraffic />

      {/* Plans */}
      {activePlans.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Plans</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activePlans.map((plan: { name: string; stripe_id: string; active_count: string }) => (
              <StatCard key={plan.stripe_id} label={plan.name} value={plan.active_count} sub={plan.stripe_id} />
            ))}
          </div>
        </section>
      )}

      {/* Charts */}
      <Card>
        <CardContent>
          <DashboardCharts data={chartData} />
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Subscriptions
            <Badge variant="secondary">MRR: ${mrr}</Badge>
          </CardTitle>
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
              {activeSubscriptions.map((sub: Record<string, unknown>) => {
                const provider = sub.sub_paddle_id ? 'paddle' : 'stripe';
                const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);
                return (
                  <TableRow key={sub.id as number}>
                    <TableCell><Link href={`/users/${sub.user_id}`} className="text-primary hover:underline">{sub.email as string}</Link></TableCell>
                    <TableCell>{sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong> <span className="text-muted-foreground">({provider})</span></TableCell>
                    <TableCell>{formatDate(sub.created_at as string)}</TableCell>
                    <TableCell>{formatDate(sub.last_active_at as string)}</TableCell>
                    <TableCell>${revenue}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Canceled Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelled Subscriptions</CardTitle>
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
              {canceledSubscriptions.map((sub: Record<string, unknown>) => {
                const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);
                return (
                  <TableRow key={sub.id as number}>
                    <TableCell><Link href={`/users/${sub.user_id}`} className="text-primary hover:underline">{sub.email as string}</Link></TableCell>
                    <TableCell>{sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong></TableCell>
                    <TableCell>{formatDate(sub.created_at as string)}</TableCell>
                    <TableCell>{formatDate(sub.last_active_at as string)}</TableCell>
                    <TableCell>${revenue}</TableCell>
                    <TableCell>
                      {formatDate(sub.canceled_at as string)}
                      {sub.cancel_reason != null && <div className="text-xs text-muted-foreground mt-1">{sub.cancel_reason as string}</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
