import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const activeSubscriptions = await query(`
    SELECT s.id, s.created_at, s.stripe_id as sub_stripe_id, s.paddle_id as sub_paddle_id,
           u.email, u.id as user_id, u.last_active_at,
           p.name as plan_name, p.stripe_id as plan_stripe_id, p.amount
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.canceled_at IS NULL
    ORDER BY s.created_at DESC
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
  `);

  const [{ mrr }] = await query(`
    SELECT COALESCE(SUM(p.amount), 0) / 100 as mrr
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.canceled_at IS NULL
  `);

  const renderRow = (sub: Record<string, unknown>, showCanceled = false) => {
    const provider = sub.sub_paddle_id ? 'paddle' : 'stripe';
    const monthsSince = Math.ceil((Date.now() - new Date(sub.created_at as string).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const revenue = Math.round((Number(sub.amount) * monthsSince) / 100);

    return (
      <tr key={sub.id as number} className="hover:bg-gray-800/50">
        <td className="px-3 py-2">
          <Link href={`/users/${sub.user_id}`} className="text-blue-400 hover:underline">{sub.email as string}</Link>
        </td>
        <td className="px-3 py-2">
          {sub.plan_name as string} <strong>${Number(sub.amount) / 100}</strong>
          <span className="text-gray-500 ml-1">({provider})</span>
        </td>
        <td className="px-3 py-2">{formatDate(sub.created_at as string)}</td>
        <td className="px-3 py-2">{formatDate(sub.last_active_at as string)}</td>
        <td className="px-3 py-2">${revenue}</td>
        {showCanceled && (
          <td className="px-3 py-2">
            {formatDate(sub.canceled_at as string)}
            {sub.cancel_reason != null && <div className="text-xs text-gray-500 mt-1">{sub.cancel_reason as string}</div>}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">Subscriptions</h1>
        <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded text-sm">MRR: ${mrr}</span>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Active ({activeSubscriptions.length})
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
              {activeSubscriptions.map((sub) => renderRow(sub))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Canceled ({canceledSubscriptions.length})
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
                <th className="px-3 py-2 text-left">Canceled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {canceledSubscriptions.map((sub) => renderRow(sub, true))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
