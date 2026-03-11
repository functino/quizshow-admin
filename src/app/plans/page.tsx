import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan: Record<string, unknown>) => {
          const data = plan.data as Record<string, unknown> | null;
          return (
            <Card key={plan.id as number}>
              <CardHeader>
                <CardTitle>{plan.name as string}</CardTitle>
                <div className="text-2xl font-bold">&euro;{Number(plan.amount) / 100}/mo</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {plan.stripe_id != null && <div>Stripe: <code className="text-xs">{plan.stripe_id as string}</code></div>}
                  {plan.paddle_id != null && <div>Paddle: <code className="text-xs">{plan.paddle_id as string}</code></div>}
                </div>

                <div className="flex gap-3">
                  <Badge variant="secondary">{plan.active_subs as number} active</Badge>
                  <Badge variant="outline">{plan.canceled_subs as number} canceled</Badge>
                </div>

                {data && (
                  <div className="text-xs text-muted-foreground">
                    {Object.entries(data).map(([lang, langData]) => (
                      <div key={lang} className="mb-2">
                        <div className="font-medium uppercase">{lang}</div>
                        {typeof langData === 'object' && langData && 'features' in langData && Array.isArray((langData as Record<string, unknown>).features) && (
                          <ul className="list-disc list-inside mt-1">
                            {((langData as Record<string, unknown>).features as string[]).map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created: {formatDate(plan.created_at as string)}</span>
                <Link href={`/plans/${plan.id}/edit`}>
                  <Button variant="outline" size="xs">Edit</Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
