import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import StatCard from '@/components/StatCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ run_id?: string; page?: string; per_page?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const runId = params.run_id || '';
  const page = parseInt(params.page || '1');
  const perPage = parseInt(params.per_page || '10');
  const offset = (page - 1) * perPage;

  // Counts
  const [{ count: resultCount }] = await query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > '2024-02-27'");
  const [{ count: eventCount }] = await query('SELECT COUNT(DISTINCT run_id) as count FROM quiz_events');

  const [{ count: resultLastMonth }] = await query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 month'");
  const [{ count: eventLastMonth }] = await query("SELECT COUNT(DISTINCT run_id) as count FROM quiz_events WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 month'");

  const [{ count: resultLastDay }] = await query("SELECT COUNT(*) as count FROM quiz_results WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'");
  const [{ count: eventLastDay }] = await query("SELECT COUNT(DISTINCT run_id) as count FROM quiz_events WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day'");

  const pct = (a: number, b: number) => b > 0 ? `${Math.round(a / b * 100)}%` : '-';

  // Events
  let eventsQuery = `
    SELECT qe.id, qe.run_id, qe.data, qe.created_at, qe.updated_at, qe.quiz_id,
           q.name as quiz_name, q.code as quiz_code, q.public as quiz_public,
           q.data as quiz_data,
           u.email as user_email, u.id as user_id, u.name as user_name
    FROM quiz_events qe
    LEFT JOIN quizzes q ON qe.quiz_id = q.id
    LEFT JOIN users u ON q.user_id = u.id
  `;
  const queryParams: unknown[] = [];
  if (runId) {
    eventsQuery += ` WHERE qe.run_id = $1`;
    queryParams.push(runId);
  }
  eventsQuery += ` ORDER BY qe.updated_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(perPage, offset);

  const events = await query(eventsQuery, queryParams);

  // Group events by run_id
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const rid = event.run_id as string;
    if (!grouped.has(rid)) grouped.set(rid, []);
    grouped.get(rid)!.push(event);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Last Day" value={`${resultLastDay} / ${eventLastDay}`} sub={`${pct(Number(resultLastDay), Number(eventLastDay))} results/events`} />
        <StatCard label="Last Month" value={`${resultLastMonth} / ${eventLastMonth}`} sub={`${pct(Number(resultLastMonth), Number(eventLastMonth))} results/events`} />
        <StatCard label="Overall" value={`${resultCount} / ${eventCount}`} sub={`${pct(Number(resultCount), Number(eventCount))} results/events`} />
      </div>

      {runId && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Filtered by run_id: <code className="text-white">{runId}</code></span>
          <Link href="/events" className="text-blue-400 hover:underline text-sm">Clear</Link>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Events</h2>
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([rid, groupEvents]) => {
            const first = groupEvents[0];
            const firstData = first.data as Record<string, unknown>;
            const lastData = groupEvents[groupEvents.length - 1].data as Record<string, unknown>;
            const startTime = firstData?.startTime as number | undefined;
            const endTime = lastData?.endTime as number | undefined;
            const durationSec = startTime && endTime ? Math.round(Math.abs(startTime - endTime) / 1000) : null;
            const durationStr = durationSec != null
              ? durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`
              : '';
            const quizData = first.quiz_data as Record<string, unknown> | null;
            const partsCount = quizData?.parts ? (quizData.parts as unknown[]).length : 0;

            return (
              <div key={rid} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                {/* Run header */}
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-sm text-white">{formatDate(first.created_at as string)}</span>
                  <Link href={`/events?run_id=${rid}`} className="font-mono text-xs text-blue-400 hover:underline">{rid}</Link>
                  {durationStr && <span className="text-xs text-gray-400">{durationStr}</span>}
                </div>
                {/* Quiz/user info */}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 flex-wrap">
                  {first.quiz_code && (
                    <Link href={`/quizzes/${first.quiz_code}/print`} className="text-blue-400 hover:underline">
                      {first.quiz_name || first.quiz_code}
                    </Link>
                  )}
                  {partsCount > 0 && <span>{partsCount} parts</span>}
                  {first.quiz_public && <strong>+</strong>}
                  {first.user_id != null && (
                    <>
                      <span>&middot;</span>
                      <Link href={`/users/${first.user_id}`} className="hover:text-gray-300">
                        {(first.user_name as string) || (first.user_email as string)}
                      </Link>
                    </>
                  )}
                  <span className="text-gray-600">{groupEvents.length} events</span>
                </div>

                {/* Individual events */}
                <div className="space-y-3">
                  {groupEvents.map((event: Record<string, unknown>) => {
                    const data = event.data as Record<string, unknown>;
                    const partData = data?.partData as Record<string, unknown> | undefined;
                    const model = partData?.model as Record<string, unknown> | undefined;
                    const partType = (data?.partType as string) || model?.type as string || 'unknown';
                    const question = model?.question as string || '';
                    const partResultData = data?.partResultData as Record<string, unknown> | undefined;
                    const players = (partResultData?.players || data?.players) as Record<string, unknown>[] | undefined;
                    const evtStart = data?.startTime as number | undefined;
                    const evtEnd = data?.endTime as number | undefined;
                    const evtDurSec = evtStart && evtEnd ? Math.round((evtEnd - evtStart) / 1000) : null;
                    const evtDurStr = evtDurSec != null
                      ? evtDurSec >= 60 ? `${Math.floor(evtDurSec / 60)}m ${evtDurSec % 60}s` : `${evtDurSec}s`
                      : '';
                    const reactions = data?.reactions as Record<string, unknown>[] | undefined;

                    return (
                      <div key={event.id as number} className="text-xs bg-gray-900/50 rounded p-3">
                        {/* Event header */}
                        <div className="flex items-center gap-2 text-gray-300 mb-1 flex-wrap">
                          <span className="font-bold text-white">{partType}</span>
                          {evtDurStr && <span className="text-gray-400">&middot; {evtDurStr}</span>}
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
                        {question && <div className="text-gray-300 mb-1">{question}</div>}

                        {/* Players */}
                        {players && Array.isArray(players) && players.length > 0 && (
                          <table className="w-full mt-1">
                            <tbody>
                              {players.map((p, pi) => (
                                <tr key={pi} className="hover:bg-gray-700/30">
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
                                  <td className="py-0.5 text-gray-400">{p.score != null ? p.score as number : (p.points != null ? p.points as number : '')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pagination */}
      <div className="flex gap-2 text-sm">
        {page > 1 && <Link href={`/events?page=${page - 1}${runId ? `&run_id=${runId}` : ''}`} className="text-blue-400 hover:underline">&larr; Previous</Link>}
        <span className="text-gray-500">Page {page}</span>
        {events.length === perPage && <Link href={`/events?page=${page + 1}${runId ? `&run_id=${runId}` : ''}`} className="text-blue-400 hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
