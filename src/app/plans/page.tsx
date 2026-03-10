import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await query(`
    SELECT p.*,
           (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.canceled_at IS NULL) as active_subs,
           (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.canceled_at IS NOT NULL) as canceled_subs
    FROM plans p
    WHERE p.active = true
    ORDER BY p.created_at
  `);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-bold text-white">Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan: Record<string, unknown>) => {
          const data = plan.data as Record<string, unknown> | null;
          return (
            <div key={plan.id as number} className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-bold text-white mb-1">{plan.name as string}</h3>
              <div className="text-2xl font-bold text-green-400 mb-3">&euro;{Number(plan.amount) / 100}/mo</div>

              <div className="space-y-1 text-sm text-gray-400 mb-4">
                {plan.stripe_id != null && <div>Stripe: <code className="text-gray-300">{plan.stripe_id as string}</code></div>}
                {plan.paddle_id != null && <div>Paddle: <code className="text-gray-300">{plan.paddle_id as string}</code></div>}
              </div>

              <div className="flex gap-4 text-sm mb-4">
                <span className="text-green-400">{plan.active_subs as number} active</span>
                <span className="text-gray-500">{plan.canceled_subs as number} canceled</span>
              </div>

              {data && (
                <div className="text-xs text-gray-500">
                  {Object.entries(data).map(([lang, langData]) => (
                    <div key={lang} className="mb-2">
                      <div className="font-bold text-gray-400 uppercase">{lang}</div>
                      {typeof langData === 'object' && langData && 'features' in langData && Array.isArray((langData as Record<string, unknown>).features) && (
                        <ul className="list-disc list-inside">
                          {((langData as Record<string, unknown>).features as string[]).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">Created: {formatDate(plan.created_at as string)}</span>
                <Link href={`/plans/${plan.id}/edit`} className="text-xs text-blue-400 hover:underline">Edit</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
