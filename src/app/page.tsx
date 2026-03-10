import { query } from '@/lib/db';
import { numberWithDelimiter } from '@/lib/format';
import StatCard from '@/components/StatCard';
import DashboardCharts from './DashboardCharts';
import Link from 'next/link';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // User stats
  const [{ count: userCount }] = await query('SELECT COUNT(*) as count FROM users');
  const [{ count: confirmedCount }] = await query('SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL');
  const [{ count: todayUsers }] = await query("SELECT COUNT(*) as count FROM users WHERE created_at > CURRENT_DATE");
  const [{ count: todayConfirmed }] = await query("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > CURRENT_DATE");
  const [{ count: monthUsers }] = await query("SELECT COUNT(*) as count FROM users WHERE created_at > DATE_TRUNC('month', CURRENT_DATE)");
  const [{ count: monthConfirmed }] = await query("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > DATE_TRUNC('month', CURRENT_DATE)");
  const [{ count: mailsAllowed }] = await query("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND mails_allowed = true AND created_at > '2020-04-23'");
  const [{ count: mailsTotal }] = await query("SELECT COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL AND created_at > '2020-04-23'");

  // Quiz stats
  const [{ count: quizCount }] = await query('SELECT COUNT(*) as count FROM quizzes');
  const [{ count: quizToday }] = await query("SELECT COUNT(*) as count FROM quizzes WHERE created_at > CURRENT_DATE");
  const [{ count: activeQuiz1d }] = await query("SELECT COUNT(*) as count FROM quizzes WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'");
  const [{ count: activeUsers1d }] = await query("SELECT COUNT(*) as count FROM users WHERE last_active_at > CURRENT_TIMESTAMP - INTERVAL '1 day'");
  const [{ count: activeQuiz3d }] = await query("SELECT COUNT(*) as count FROM quizzes WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '3 day'");
  const [{ count: activeUsers3d }] = await query("SELECT COUNT(*) as count FROM users WHERE last_active_at > CURRENT_TIMESTAMP - INTERVAL '3 day'");

  // Chart data - quizzes by month
  const quizByMonth = await query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM quizzes GROUP BY month ORDER BY month");
  const userByMonth = await query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM users GROUP BY month ORDER BY month");
  const confirmedByMonth = await query("SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM users WHERE confirmed_at IS NOT NULL GROUP BY month ORDER BY month");

  // Subscriptions
  const activeSubscriptions = await query(`
    SELECT s.id, s.created_at, s.stripe_id as sub_stripe_id, s.paddle_id as sub_paddle_id,
           u.email, u.id as user_id, u.last_active_at,
           p.name as plan_name, p.stripe_id as plan_stripe_id, p.amount
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.canceled_at IS NULL
    ORDER BY s.created_at DESC
    LIMIT 5
  `);

  const canceledSubscriptions = await query(`
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
  `);

  // MRR calculation
  const [{ mrr }] = await query(`
    SELECT COALESCE(SUM(p.amount), 0) / 100 as mrr
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.canceled_at IS NULL
  `);

  // Plans with active subscription counts
  const activePlans = await query(`
    SELECT p.name, p.stripe_id, COUNT(s.id) as active_count
    FROM plans p
    JOIN subscriptions s ON s.plan_id = p.id
    WHERE s.canceled_at IS NULL
    GROUP BY p.id, p.name, p.stripe_id
    HAVING COUNT(s.id) > 0
    ORDER BY COUNT(s.id) DESC
  `);

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
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={numberWithDelimiter(Number(userCount))} sub={`${numberWithDelimiter(Number(confirmedCount))} confirmed (${confirmedPct}%)`} />
          <StatCard label="Today" value={Number(todayUsers)} sub={`${todayConfirmed} confirmed`} />
          <StatCard label="This Month" value={Number(monthUsers)} sub={`${monthConfirmed} confirmed (${monthConfPct}%)`} />
          <StatCard label="Mails Allowed" value={`${mailsPct}%`} sub={`${numberWithDelimiter(Number(mailsAllowed))} of ${numberWithDelimiter(Number(mailsTotal))}`} />
        </div>
      </section>

      {/* Quizzes */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">Quizzes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={numberWithDelimiter(Number(quizCount))} sub={`Today: ${quizToday}`} />
          <StatCard label="Active (1d)" value={Number(activeQuiz1d)} sub={`${activeUsers1d} users`} />
          <StatCard label="Active (3d)" value={Number(activeQuiz3d)} sub={`${activeUsers3d} users`} />
        </div>
      </section>

      {/* Plans */}
      {activePlans.length > 0 && (
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">Active Plans</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activePlans.map((plan: { name: string; stripe_id: string; active_count: string }) => (
              <StatCard key={plan.stripe_id} label={plan.name} value={plan.active_count} sub={plan.stripe_id} />
            ))}
          </div>
        </section>
      )}

      {/* Charts */}
      <DashboardCharts data={chartData} />

      {/* Subscriptions */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">
          Subscriptions <span className="text-gray-600 normal-case">MRR: ${mrr}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Last Active</th>
                <th className="px-3 py-2 text-left">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {activeSubscriptions.map((sub: Record<string, unknown>) => {
                const provider = sub.sub_paddle_id ? 'paddle' : 'stripe';
                const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);
                return (
                  <tr key={sub.id as number} className="hover:bg-gray-800/50">
                    <td className="px-3 py-2"><Link href={`/users/${sub.user_id}`} className="text-blue-400 hover:underline">{sub.email as string}</Link></td>
                    <td className="px-3 py-2">{sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong> ({provider})</td>
                    <td className="px-3 py-2">{formatDate(sub.created_at as string)}</td>
                    <td className="px-3 py-2">{formatDate(sub.last_active_at as string)}</td>
                    <td className="px-3 py-2">${revenue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Canceled Subscriptions */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">Cancelled Subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Last Active</th>
                <th className="px-3 py-2 text-left">Revenue</th>
                <th className="px-3 py-2 text-left">Canceled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {canceledSubscriptions.map((sub: Record<string, unknown>) => {
                const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);
                return (
                  <tr key={sub.id as number} className="hover:bg-gray-800/50">
                    <td className="px-3 py-2"><Link href={`/users/${sub.user_id}`} className="text-blue-400 hover:underline">{sub.email as string}</Link></td>
                    <td className="px-3 py-2">{sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong></td>
                    <td className="px-3 py-2">{formatDate(sub.created_at as string)}</td>
                    <td className="px-3 py-2">{formatDate(sub.last_active_at as string)}</td>
                    <td className="px-3 py-2">${revenue}</td>
                    <td className="px-3 py-2">
                      {formatDate(sub.canceled_at as string)}
                      {sub.cancel_reason != null && <div className="text-xs text-gray-500 mt-1">{sub.cancel_reason as string}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
