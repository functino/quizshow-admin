import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ code?: string; page?: string }>;
}

function emojiImgUrl(emoji: string): string {
  if (emoji.startsWith('/')) return `https://quiz.sh${emoji}`;
  return `https://quiz.sh/images/emoji/apple/${emoji}.png`;
}

function avatarImgUrl(avatar: string): string {
  if (!avatar) return '';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `https://quiz.sh${avatar}`;
}

export default async function ResultsPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params.code || '';
  const page = parseInt(params.page || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  // Results
  let resultsQuery = `
    SELECT qr.id, qr.data, qr.created_at, qr.quiz_id,
           q.name as quiz_name, q.code as quiz_code, q.public as quiz_public,
           q.data as quiz_data,
           u.email as user_email, u.id as user_id, u.name as user_name
    FROM quiz_results qr
    JOIN quizzes q ON qr.quiz_id = q.id
    LEFT JOIN users u ON q.user_id = u.id
  `;
  const queryParams: unknown[] = [];
  if (code) {
    resultsQuery += ` WHERE qr.data->>'quizCode' = $1`;
    queryParams.push(code);
  }
  resultsQuery += ` ORDER BY qr.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(perPage, offset);

  const results = await query(resultsQuery, queryParams);

  // Reaction stats
  const reactionsLastDay = await query(`
    SELECT reactions.key AS emoji, SUM((reactions.value)::int) AS count
    FROM quiz_results,
    LATERAL jsonb_each(quiz_results.data->'reactions') AS reactions
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 day'
    GROUP BY reactions.key ORDER BY count DESC
  `);

  const reactionsLastMonth = await query(`
    SELECT reactions.key AS emoji, SUM((reactions.value)::int) AS count
    FROM quiz_results,
    LATERAL jsonb_each(quiz_results.data->'reactions') AS reactions
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
    GROUP BY reactions.key ORDER BY count DESC
  `);

  const reactionsAllTime = await query(`
    SELECT reactions.key AS emoji, SUM((reactions.value)::int) AS count
    FROM quiz_results,
    LATERAL jsonb_each(quiz_results.data->'reactions') AS reactions
    GROUP BY reactions.key ORDER BY count DESC
  `);

  const renderReactions = (reactions: Record<string, unknown>[]) => (
    <div className="flex flex-wrap gap-1">
      {reactions.map((r, i) => (
        <span key={i} className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-xs">
          <img src={emojiImgUrl(r.emoji as string)} alt="" className="w-4 h-4" />
          <strong>{r.count as number}</strong>
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Nav links */}
      <div className="flex gap-4 items-center">
        <Link href="/candidates?min=10" className="text-sm text-blue-400 hover:underline">Candidates</Link>
        <Link href="/results" className="text-sm text-blue-400 hover:underline">Results</Link>
        <Link href="/avatars" className="text-sm text-blue-400 hover:underline">Avatars</Link>
      </div>

      {/* Filter */}
      <form className="flex gap-2">
        <input
          type="text"
          name="code"
          defaultValue={code}
          placeholder="Filter by quiz code..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">Filter</button>
        {code && <Link href="/results" className="text-gray-400 hover:text-white px-2 py-1.5 text-sm">Clear</Link>}
      </form>

      {/* Reactions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Reactions</h2>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Last 24h:</span>
            {renderReactions(reactionsLastDay)}
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">Last month:</span>
            {renderReactions(reactionsLastMonth)}
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-1">All time:</span>
            {renderReactions(reactionsAllTime)}
          </div>
        </div>
      </section>

      {/* Results */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Quiz Results {code && `(code: ${code})`}
        </h2>
        <div className="space-y-4">
          {results.map((r: Record<string, unknown>) => {
            const data = r.data as Record<string, unknown>;
            const players = (data?.players as Record<string, unknown>[]) || [];
            const reactions = data?.reactions as Record<string, number> | undefined;
            const quizData = r.quiz_data as Record<string, unknown> | null;
            const partsCount = quizData?.parts ? (quizData.parts as unknown[]).length : 0;
            const startTime = data?.startTime as number | undefined;
            const endTime = data?.endTime as number | undefined;
            const durationMin = startTime && endTime ? Math.round((endTime - startTime) / 1000 / 60) : null;

            return (
              <div key={r.id as number} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-bold">{formatDate(r.created_at as string)}</span>
                    {durationMin != null && <span className="text-gray-400 text-xs">{durationMin} min</span>}
                    <span className="text-gray-400 text-xs">{players.length} Players</span>
                    {data?.runId != null && (
                      <Link href={`/events?run_id=${data.runId}`} className="text-blue-400 hover:underline font-mono text-xs">
                        ({(data.runId as string).slice(0, 8)}...)
                      </Link>
                    )}
                  </div>
                </div>
                {/* Meta line */}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 flex-wrap">
                  <Link href={`/quizzes/${r.quiz_code}/print`} className="text-blue-400 hover:underline">
                    {r.quiz_name as string}
                  </Link>
                  <span>{partsCount} parts</span>
                  {r.quiz_public != null && r.quiz_public && <strong>+</strong>}
                  <span>&middot;</span>
                  {r.user_id != null && (
                    <Link href={`/users/${r.user_id}`} className="hover:text-gray-300">
                      {(r.user_name as string) || (r.user_email as string)}
                    </Link>
                  )}
                  <Link href={`/results?code=${r.quiz_code}`} className="font-mono">
                    {r.quiz_code as string}
                  </Link>
                  {reactions && Object.entries(reactions).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-0.5">
                      &middot; <img src={emojiImgUrl(emoji)} alt="" className="w-3 h-3 inline" /> {count}
                    </span>
                  ))}
                </div>
                {/* Players table */}
                {players.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <tbody>
                      {players
                        .sort((a, b) => ((b.points as number) || 0) - ((a.points as number) || 0))
                        .map((p, i) => {
                          const playerReactions = p.reactions as Record<string, number> | undefined;
                          return (
                            <tr key={i} className="hover:bg-gray-700/30">
                              <td className="py-1 pr-2">{(p.name as string) || `Player ${i + 1}`}</td>
                              <td className="py-1 pr-2">
                                {p.avatar != null && <img src={avatarImgUrl(p.avatar as string)} alt="" className="w-5 h-5 inline rounded" />}
                              </td>
                              <td className="py-1 pr-2 text-gray-400">{p.points != null ? `${p.points}pts` : ''}</td>
                              <td className="py-1">
                                {playerReactions && Object.entries(playerReactions).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                                  <span key={emoji} className="inline-flex items-center gap-0.5 mr-1">
                                    <img src={emojiImgUrl(emoji)} alt="" className="w-3 h-3" /> {count}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pagination */}
      <div className="flex gap-2 text-sm">
        {page > 1 && <Link href={`/results?page=${page - 1}${code ? `&code=${code}` : ''}`} className="text-blue-400 hover:underline">&larr; Previous</Link>}
        <span className="text-gray-500">Page {page}</span>
        {results.length === perPage && <Link href={`/results?page=${page + 1}${code ? `&code=${code}` : ''}`} className="text-blue-400 hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
