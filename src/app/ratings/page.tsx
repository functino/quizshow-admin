import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ code?: string; page?: string }>;
}

async function getRatingStats() {
  const [overall, lastMonth, lastDay, histLastDay, histLastMonth, histAllTime] = await Promise.all([
    query(`SELECT COUNT(*)::int as count, AVG(rating)::float as avg FROM quiz_ratings`).then(r => r[0]),
    query(`SELECT COUNT(*)::int as count, AVG(rating)::float as avg FROM quiz_ratings WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 month'`).then(r => r[0]),
    query(`SELECT COUNT(*)::int as count, AVG(rating)::float as avg FROM quiz_ratings WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'`).then(r => r[0]),
    query(`SELECT rating, COUNT(*)::int as count FROM quiz_ratings WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' GROUP BY rating ORDER BY rating`),
    query(`SELECT rating, COUNT(*)::int as count FROM quiz_ratings WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 month' GROUP BY rating ORDER BY rating`),
    query(`SELECT rating, COUNT(*)::int as count FROM quiz_ratings GROUP BY rating ORDER BY rating`),
  ]);
  return { overall, lastMonth, lastDay, histLastDay, histLastMonth, histAllTime };
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.round(rating);
  const fontSize = size === 'sm' ? '0.9em' : '1.1em';
  return (
    <span style={{ color: '#e8b84a', fontSize, letterSpacing: '1px' }} aria-label={`${rating} out of 5`}>
      {'★'.repeat(full)}
      <span style={{ color: '#d8d8d8' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}

function Histogram({ data, total }: { data: { rating: number; count: number }[]; total: number }) {
  const byRating = new Map(data.map(d => [Number(d.rating), Number(d.count)]));
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map(n => {
        const count = byRating.get(n) || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={n} className="flex items-center gap-2 text-xs">
            <span className="w-8 tabular-nums">{n}★</span>
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-16 text-right tabular-nums text-muted-foreground">
              {count} ({pct.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function RatingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params.code || '';
  const page = parseInt(params.page || '1');
  const perPage = 30;
  const offset = (page - 1) * perPage;

  const { overall, lastMonth, lastDay, histLastDay, histLastMonth, histAllTime } = await getRatingStats();

  let runsQuery = `
    SELECT qr.run_id, qr.quiz_id, MAX(qr.created_at) as latest_at,
           COUNT(*)::int as rating_count, AVG(qr.rating)::float as avg_rating,
           q.name as quiz_name, q.code as quiz_code, q.public as quiz_public,
           u.email as user_email, u.id as user_id, u.name as user_name
    FROM quiz_ratings qr
    LEFT JOIN quizzes q ON qr.quiz_id = q.id
    LEFT JOIN users u ON q.user_id = u.id
  `;
  const queryParams: unknown[] = [];
  if (code) {
    runsQuery += ` WHERE q.code = $1`;
    queryParams.push(code);
  }
  runsQuery += ` GROUP BY qr.run_id, qr.quiz_id, q.name, q.code, q.public, u.email, u.id, u.name
    ORDER BY latest_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(perPage, offset);

  const runs = await query(runsQuery, queryParams);

  const runIds = runs.map(r => r.run_id as string);
  const ratings = runIds.length === 0 ? [] : await query(
    `SELECT run_id, rating, player_id, created_at FROM quiz_ratings
     WHERE run_id = ANY($1) ORDER BY created_at ASC`,
    [runIds],
  );

  const ratingsByRun = new Map<string, Record<string, unknown>[]>();
  for (const r of ratings) {
    const rid = r.run_id as string;
    if (!ratingsByRun.has(rid)) ratingsByRun.set(rid, []);
    ratingsByRun.get(rid)!.push(r);
  }

  const playerNamesByRun = runIds.length === 0 ? new Map<string, Map<string, string>>() : await (async () => {
    const resultRows = await query(
      `SELECT data FROM quiz_results WHERE data->>'runId' = ANY($1)`,
      [runIds],
    );
    const map = new Map<string, Map<string, string>>();
    for (const row of resultRows) {
      const data = row.data as Record<string, unknown>;
      const rid = data?.runId as string;
      if (!rid) continue;
      const players = (data?.players as Record<string, unknown>[]) || [];
      const playerMap = new Map<string, string>();
      for (const p of players) {
        const id = p.id as string | undefined;
        const name = (p.name as string | undefined) || '';
        if (id) playerMap.set(id, name);
      }
      map.set(rid, playerMap);
    }
    return map;
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Last Day"
          value={overall?.count ? `${Number(lastDay?.avg ?? 0).toFixed(2)}★` : '-'}
          sub={`${lastDay?.count ?? 0} ratings`}
        />
        <StatCard
          label="Last Month"
          value={lastMonth?.count ? `${Number(lastMonth.avg).toFixed(2)}★` : '-'}
          sub={`${lastMonth?.count ?? 0} ratings`}
        />
        <StatCard
          label="Overall"
          value={overall?.count ? `${Number(overall.avg).toFixed(2)}★` : '-'}
          sub={`${overall?.count ?? 0} ratings`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram data={histLastDay as { rating: number; count: number }[]} total={Number(lastDay?.count ?? 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last month</CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram data={histLastMonth as { rating: number; count: number }[]} total={Number(lastMonth?.count ?? 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All time</CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram data={histAllTime as { rating: number; count: number }[]} total={Number(overall?.count ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {code && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by quiz code: <code className="font-mono">{code}</code></span>
          <Link href="/ratings" className="text-primary hover:underline text-sm">Clear</Link>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent ratings</h2>
        <div className="space-y-3">
          {runs.map((run: Record<string, unknown>) => {
            const rid = run.run_id as string;
            const runRatings = ratingsByRun.get(rid) || [];
            const avg = Number(run.avg_rating);
            const playerMap = playerNamesByRun.get(rid);
            return (
              <Card key={rid}>
                <CardContent>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-medium">{formatDate(run.latest_at as string)}</span>
                    <Stars rating={avg} size="md" />
                    <span className="text-sm tabular-nums">{avg.toFixed(2)}</span>
                    <Badge variant="secondary">{run.rating_count as number} ratings</Badge>
                    <Link href={`/events?run_id=${rid}`} className="font-mono text-xs text-primary hover:underline">
                      {rid.slice(0, 8)}...
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                    {run.quiz_code ? (
                      <Link href={`/quizzes/${run.quiz_code}/print`} className="text-primary hover:underline">
                        {(run.quiz_name as string) || (run.quiz_code as string)}
                      </Link>
                    ) : (
                      <span>Quiz #{run.quiz_id as number}</span>
                    )}
                    {run.quiz_public ? <strong>+</strong> : null}
                    {run.user_id != null && (
                      <>
                        <span>&middot;</span>
                        <Link href={`/users/${run.user_id}`} className="hover:text-foreground">
                          {(run.user_name as string) || (run.user_email as string)}
                        </Link>
                      </>
                    )}
                    {run.quiz_code ? (
                      <Link href={`/ratings?code=${run.quiz_code}`} className="font-mono">
                        {run.quiz_code as string}
                      </Link>
                    ) : null}
                  </div>

                  <table className="w-full text-xs mt-2">
                    <tbody>
                      {runRatings.map((r, i) => {
                        const pid = r.player_id as string | undefined;
                        const playerName = pid && playerMap ? playerMap.get(pid) : undefined;
                        return (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="py-1 pr-2 w-32">
                              {playerName || <span className="font-mono text-muted-foreground">{pid ? pid.slice(0, 8) : '—'}</span>}
                            </td>
                            <td className="py-1 pr-2">
                              <Stars rating={Number(r.rating)} />
                            </td>
                            <td className="py-1 text-muted-foreground tabular-nums">{String(r.rating)}/5</td>
                            <td className="py-1 text-muted-foreground text-right">{formatDate(r.created_at as string)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
          {runs.length === 0 && (
            <div className="text-sm text-muted-foreground">No ratings yet.</div>
          )}
        </div>
      </section>

      <div className="flex gap-2 text-sm items-center">
        {page > 1 && <Link href={`/ratings?page=${page - 1}${code ? `&code=${code}` : ''}`} className="text-primary hover:underline">&larr; Previous</Link>}
        <span className="text-muted-foreground">Page {page}</span>
        {runs.length === perPage && <Link href={`/ratings?page=${page + 1}${code ? `&code=${code}` : ''}`} className="text-primary hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
