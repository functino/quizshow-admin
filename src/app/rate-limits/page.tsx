import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ page?: string; user_id?: string; feature?: string }>;
}

export default async function RateLimitsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const perPage = 100;
  const offset = (page - 1) * perPage;

  const filters: string[] = [];
  const queryParams: unknown[] = [];
  if (params.user_id) {
    queryParams.push(parseInt(params.user_id));
    filters.push(`rl.user_id = $${queryParams.length}`);
  }
  if (params.feature) {
    queryParams.push(params.feature);
    filters.push(`rl.feature = $${queryParams.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  queryParams.push(perPage, offset);
  const rows = await query(
    `
    SELECT rl.id, rl.user_id, rl.feature, rl.created_at,
           u.email AS user_email, u.name AS user_name,
           q.id AS quiz_id, q.code AS quiz_code, q.name AS quiz_name
    FROM rate_limits rl
    LEFT JOIN users u ON u.id = rl.user_id
    LEFT JOIN LATERAL (
      SELECT id, code, name
      FROM quizzes
      WHERE user_id = rl.user_id
        AND created_at <= rl.created_at
      ORDER BY COALESCE(last_run_at, last_done_at, updated_at, created_at) DESC
      LIMIT 1
    ) q ON true
    ${where}
    ORDER BY rl.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `,
    queryParams,
  );

  const featureCounts = await query(
    `
    SELECT feature, COUNT(*)::int AS count
    FROM rate_limits
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
    GROUP BY feature
    ORDER BY count DESC
    `,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Rate Limits</h1>

      {featureCounts.length > 0 && (
        <Card>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Last 24h by feature</div>
            <div className="flex flex-wrap gap-2">
              {featureCounts.map((f: Record<string, unknown>) => (
                <Link
                  key={f.feature as string}
                  href={`/rate-limits?feature=${encodeURIComponent(f.feature as string)}`}
                  className="hover:underline"
                >
                  <Badge variant="secondary">
                    {f.feature as string} · {f.count as number}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(params.user_id || params.feature) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered by:</span>
          {params.user_id && <Badge variant="outline">user {params.user_id}</Badge>}
          {params.feature && <Badge variant="outline">{params.feature}</Badge>}
          <Link href="/rate-limits" className="text-primary hover:underline">Clear</Link>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Feature</th>
                <th className="text-left px-3 py-2">Recent quiz</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: Record<string, unknown>) => (
                <tr key={r.id as number} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">{formatDate(r.created_at as string)}</td>
                  <td className="px-3 py-2">
                    {r.user_id != null ? (
                      <Link href={`/users/${r.user_id}`} className="text-primary hover:underline">
                        {(r.user_name as string) || (r.user_email as string) || `#${r.user_id as number}`}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/rate-limits?feature=${encodeURIComponent(r.feature as string)}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.feature as string}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.quiz_code ? (
                      <Link href={`/quizzes/${r.quiz_code}/print`} className="text-primary hover:underline">
                        {(r.quiz_name as string) || (r.quiz_code as string)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No rate limit entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex gap-2 text-sm items-center">
        {page > 1 && (
          <Link
            href={`/rate-limits?page=${page - 1}${params.user_id ? `&user_id=${params.user_id}` : ''}${params.feature ? `&feature=${encodeURIComponent(params.feature)}` : ''}`}
            className="text-primary hover:underline"
          >
            &larr; Previous
          </Link>
        )}
        <span className="text-muted-foreground">Page {page}</span>
        {rows.length === perPage && (
          <Link
            href={`/rate-limits?page=${page + 1}${params.user_id ? `&user_id=${params.user_id}` : ''}${params.feature ? `&feature=${encodeURIComponent(params.feature)}` : ''}`}
            className="text-primary hover:underline"
          >
            Next &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
