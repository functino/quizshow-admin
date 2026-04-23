import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getEventStats = unstable_cache(
  async () => {
    const [resultCount, eventCount, resultLastMonth, eventLastMonth, resultLastDay, eventLastDay] = await Promise.all([
      query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > '2024-02-27'").then(r => r[0].count),
      query('SELECT COUNT(DISTINCT run_id) as count FROM quiz_events').then(r => r[0].count),
      query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 month'").then(r => r[0].count),
      query("SELECT COUNT(DISTINCT run_id) as count FROM quiz_events WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 month'").then(r => r[0].count),
      query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'").then(r => r[0].count),
      query("SELECT COUNT(DISTINCT run_id) as count FROM quiz_events WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'").then(r => r[0].count),
    ]);
    return { resultCount, eventCount, resultLastMonth, eventLastMonth, resultLastDay, eventLastDay };
  },
  ['events-stats'],
  { revalidate: 300 },
);

// Paginated list of recent run_ids. Sourced from quiz_results (one row per finished run,
// indexed on created_at via the serial pkey ordering), which avoids a GROUP BY across
// the much larger quiz_events table. Runs without a completed quiz_results row won't appear.
const getRecentRunIds = unstable_cache(
  async (perPage: number, offset: number): Promise<string[]> => {
    const rows = await query(
      `SELECT data->>'runId' AS run_id
       FROM quiz_results
       WHERE data ? 'runId'
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [perPage, offset],
    );
    return rows.map(r => r.run_id as string).filter(Boolean);
  },
  ['events-recent-run-ids'],
  { revalidate: 60 },
);

interface Props {
  searchParams: Promise<{ run_id?: string; page?: string; per_page?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const runId = params.run_id || '';
  const page = parseInt(params.page || '1');
  const perPage = parseInt(params.per_page || '10');
  const offset = (page - 1) * perPage;

  const { resultCount, eventCount, resultLastMonth, eventLastMonth, resultLastDay, eventLastDay } = await getEventStats();

  const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : '-';

  const runIds: string[] = runId ? [runId] : await getRecentRunIds(perPage, offset);

  // Only project the fields we actually render. Historically, `data` held a full
  // snapshot of every player (including base64 `data:` avatars up to ~250 kB each),
  // so selecting `qe.data` shipped ~7 MB per page. Projecting individual jsonb paths
  // and stripping data-URL avatars keeps the payload under ~200 kB.
  const events = runIds.length === 0 ? [] : await query(
    `SELECT qe.id, qe.run_id, qe.created_at, qe.updated_at, qe.quiz_id,
            (qe.data->'startTime')::bigint AS start_time,
            (qe.data->'endTime')::bigint AS end_time,
            qe.data->>'partType' AS part_type,
            qe.data->'partData'->'model'->>'type' AS model_type,
            qe.data->'partData'->'model'->>'question' AS question,
            (SELECT jsonb_agg(jsonb_build_object(
                'name', p->'name',
                'avatar', CASE WHEN p->>'avatar' LIKE 'data:%' THEN NULL ELSE p->'avatar' END,
                'score', p->'score',
                'points', p->'points',
                'id', p->'id'))
             FROM jsonb_array_elements(
               COALESCE(qe.data->'partResultData'->'players', qe.data->'players')
             ) p) AS players,
            qe.data->'reactions' AS reactions,
            q.name as quiz_name, q.code as quiz_code, q.public as quiz_public,
            COALESCE(jsonb_array_length(q.data->'parts'), 0) as parts_count,
            u.email as user_email, u.id as user_id, u.name as user_name
     FROM quiz_events qe
     LEFT JOIN quizzes q ON qe.quiz_id = q.id
     LEFT JOIN users u ON q.user_id = u.id
     WHERE qe.run_id = ANY($1)
     ORDER BY qe.updated_at DESC`,
    [runIds],
  );

  const grouped = new Map<string, typeof events>();
  for (const rid of runIds) grouped.set(rid, []);
  for (const event of events) {
    const rid = event.run_id as string;
    if (!grouped.has(rid)) grouped.set(rid, []);
    grouped.get(rid)!.push(event);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Last Day" value={`${resultLastDay} / ${eventLastDay}`} sub={`${pct(Number(resultLastDay), Number(eventLastDay))} results/events`} />
        <StatCard label="Last Month" value={`${resultLastMonth} / ${eventLastMonth}`} sub={`${pct(Number(resultLastMonth), Number(eventLastMonth))} results/events`} />
        <StatCard label="Overall" value={`${resultCount} / ${eventCount}`} sub={`${pct(Number(resultCount), Number(eventCount))} results/events`} />
      </div>

      {runId && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by run_id: <code className="font-mono">{runId}</code></span>
          <Link href="/events" className="text-primary hover:underline text-sm">Clear</Link>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Events</h2>
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([rid, groupEvents]) => {
            const first = groupEvents[0];
            const last = groupEvents[groupEvents.length - 1];
            const startTime = first.start_time != null ? Number(first.start_time) : undefined;
            const endTime = last.end_time != null ? Number(last.end_time) : undefined;
            const durationSec = startTime && endTime ? Math.round(Math.abs(startTime - endTime) / 1000) : null;
            const durationStr = durationSec != null
              ? durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`
              : '';
            const partsCount = Number(first.parts_count) || 0;

            return (
              <Card key={rid}>
                <CardContent>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-medium">{formatDate(first.created_at as string)}</span>
                    <Link href={`/events?run_id=${rid}`} className="font-mono text-xs text-primary hover:underline">{rid}</Link>
                    {durationStr && <Badge variant="outline">{durationStr}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    {first.quiz_code && (
                      <Link href={`/quizzes/${first.quiz_code}/print`} className="text-primary hover:underline">
                        {first.quiz_name || first.quiz_code}
                      </Link>
                    )}
                    {partsCount > 0 && <span>{partsCount} parts</span>}
                    {first.quiz_public && <strong>+</strong>}
                    {first.user_id != null && (
                      <>
                        <span>&middot;</span>
                        <Link href={`/users/${first.user_id}`} className="hover:text-foreground">
                          {(first.user_name as string) || (first.user_email as string)}
                        </Link>
                      </>
                    )}
                    <Badge variant="secondary">{groupEvents.length} events</Badge>
                  </div>

                  <div className="space-y-2">
                    {groupEvents.map((event: Record<string, unknown>) => {
                      const partType = (event.part_type as string) || (event.model_type as string) || 'unknown';
                      const question = (event.question as string) || '';
                      const players = event.players as Record<string, unknown>[] | null;
                      const evtStart = event.start_time != null ? Number(event.start_time) : undefined;
                      const evtEnd = event.end_time != null ? Number(event.end_time) : undefined;
                      const evtDurSec = evtStart && evtEnd ? Math.round((evtEnd - evtStart) / 1000) : null;
                      const evtDurStr = evtDurSec != null
                        ? evtDurSec >= 60 ? `${Math.floor(evtDurSec / 60)}m ${evtDurSec % 60}s` : `${evtDurSec}s`
                        : '';
                      const reactions = event.reactions as Record<string, unknown>[] | undefined;

                      return (
                        <div key={event.id as number} className="text-xs bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold">{partType}</span>
                            {evtDurStr && <span className="text-muted-foreground">&middot; {evtDurStr}</span>}
                            {reactions && Array.isArray(reactions) && (() => {
                              const grouped = (reactions as Record<string, unknown>[]).reduce<Record<string, number>>((acc, r) => {
                                const t = r.type as string;
                                acc[t] = (acc[t] || 0) + 1;
                                return acc;
                              }, {});
                              return Object.entries(grouped).map(([type, count]) => (
                                <span key={type} className="flex items-center gap-0.5">
                                  &middot; <img src={`https://quiz.sh/images/emoji/apple/${type}.png`} alt="" className="w-3 h-3" /> {count}
                                </span>
                              ));
                            })()}
                          </div>
                          {question && <div className="text-muted-foreground mb-1">{question}</div>}

                          {players && Array.isArray(players) && players.length > 0 && (
                            <table className="w-full mt-1">
                              <tbody>
                                {players.map((p, pi) => (
                                  <tr key={pi} className="hover:bg-muted/50">
                                    <td className="py-0.5 pr-2">{(p.name as string) || `Player ${pi + 1}`}</td>
                                    <td className="py-0.5 pr-2">
                                      {p.avatar != null && (
                                        <img
                                          src={(p.avatar as string).startsWith('http') || (p.avatar as string).startsWith('data:')
                                            ? p.avatar as string
                                            : `https://quiz.sh${p.avatar}`}
                                          alt="" className="w-4 h-4 inline rounded"
                                        />
                                      )}
                                    </td>
                                    <td className="py-0.5 text-muted-foreground">{p.score != null ? p.score as number : (p.points != null ? p.points as number : '')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="flex gap-2 text-sm items-center">
        {page > 1 && <Link href={`/events?page=${page - 1}${runId ? `&run_id=${runId}` : ''}`} className="text-primary hover:underline">&larr; Previous</Link>}
        <span className="text-muted-foreground">Page {page}</span>
        {!runId && runIds.length === perPage && <Link href={`/events?page=${page + 1}`} className="text-primary hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
