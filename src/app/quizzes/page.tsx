import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import DataTable from '@/components/DataTable';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function QuizzesPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || '';

  // Last created quizzes
  const lastQuizzes = await query(`
    SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count, q.done_count, q.last_run_at,
           u.email as user_email, u.id as user_id
    FROM quizzes q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC LIMIT 10
  `);

  // Last changed quizzes
  const lastChangedQuizzes = await query(`
    SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count, q.done_count,
           u.email as user_email, u.id as user_id
    FROM quizzes q
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.updated_at DESC LIMIT 10
  `);

  // Last played quizzes
  const lastPlayedQuizzes = await query(`
    SELECT q.id, q.name, q.code, q.last_run_at, q.run_count, q.done_count,
           u.email as user_email, u.id as user_id
    FROM quizzes q
    LEFT JOIN users u ON q.user_id = u.id
    WHERE q.last_run_at IS NOT NULL
    ORDER BY q.last_run_at DESC LIMIT 10
  `);

  // Biggest quizzes (most parts, last month)
  const biggestQuizzes = await query(`
    SELECT q.id, q.name, q.code, q.updated_at, jsonb_array_length(q.data->'parts') as parts_count,
           u.email as user_email, u.id as user_id
    FROM quizzes q
    LEFT JOIN users u ON q.user_id = u.id
    WHERE q.updated_at > CURRENT_DATE - INTERVAL '1 month'
    AND q.data->'parts' IS NOT NULL AND jsonb_typeof(q.data->'parts') = 'array'
    ORDER BY parts_count DESC LIMIT 10
  `);

  // Max players (last 3 days)
  const maxPlayers = await query(`
    SELECT q.id, q.name, q.code, jsonb_array_length(qr.data->'players') as players_count,
           u.email as user_email, u.id as user_id, qr.created_at
    FROM quiz_results qr
    JOIN quizzes q ON qr.quiz_id = q.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE qr.created_at > CURRENT_DATE - INTERVAL '3 day'
    AND qr.data->'players' IS NOT NULL
    AND jsonb_array_length(qr.data->'players') IS NOT NULL
    ORDER BY players_count DESC LIMIT 10
  `);

  // Most results
  const mostResults = await query(`
    SELECT q.id, q.name, q.code, COUNT(*) as result_count,
           u.email as user_email, u.id as user_id
    FROM quiz_results qr
    JOIN quizzes q ON q.id = qr.quiz_id
    LEFT JOIN users u ON q.user_id = u.id
    GROUP BY q.id, q.name, q.code, u.email, u.id
    ORDER BY result_count DESC LIMIT 10
  `);

  // Most results last week
  const mostResultsLastWeek = await query(`
    SELECT q.id, q.name, q.code, COUNT(*) as result_count,
           u.email as user_email, u.id as user_id
    FROM quiz_results qr
    JOIN quizzes q ON q.id = qr.quiz_id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE qr.created_at > CURRENT_DATE - INTERVAL '1 week'
    GROUP BY q.id, q.name, q.code, u.email, u.id
    ORDER BY result_count DESC LIMIT 10
  `);

  // Player count stats
  const playerStats = await query(`
    SELECT COUNT(*) as num, jsonb_array_length(data->'players') as players
    FROM quiz_results
    GROUP BY players ORDER BY players DESC
  `);

  const playerStatsLastDay = await query(`
    SELECT COUNT(*) as num, jsonb_array_length(data->'players') as players
    FROM quiz_results
    WHERE created_at > CURRENT_DATE - INTERVAL '1 day'
    GROUP BY players ORDER BY players DESC
  `);

  // Search results
  let searchResults: Record<string, unknown>[] = [];
  if (search) {
    searchResults = await query(`
      SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count,
             u.email as user_email, u.id as user_id
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.name ILIKE $1
      ORDER BY q.updated_at DESC LIMIT 20
    `, [`%${search}%`]);
  }

  const quizHeaders = ['Name', 'Code', 'User', 'Runs', 'Done', 'Date'];

  const renderQuizRow = (q: Record<string, unknown>, dateField: string = 'created_at') => (
    <tr key={`${q.id}-${dateField}`} className="hover:bg-gray-800/50">
      <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
      <td className="px-3 py-2 font-mono text-xs">{q.code as string}</td>
      <td className="px-3 py-2">
        {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
      </td>
      <td className="px-3 py-2">{q.run_count as number}</td>
      <td className="px-3 py-2">{q.done_count as number}</td>
      <td className="px-3 py-2">{formatDate(q[dateField] as string)}</td>
    </tr>
  );

  return (
    <div className="space-y-8">
      {/* Search */}
      <form className="flex gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search quiz by name..."
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">Search</button>
      </form>

      {search && (
        <DataTable headers={quizHeaders} title={`Search results for "${search}"`}>
          {searchResults.map((q) => renderQuizRow(q, 'updated_at'))}
          {searchResults.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-gray-500 text-center">No results</td></tr>}
        </DataTable>
      )}

      <DataTable headers={quizHeaders} title="Last Created">
        {lastQuizzes.map((q) => renderQuizRow(q))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Runs', 'Done', 'Updated']} title="Last Changed">
        {lastChangedQuizzes.map((q) => renderQuizRow(q, 'updated_at'))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Runs', 'Done', 'Last Played']} title="Last Played">
        {lastPlayedQuizzes.map((q) => renderQuizRow(q, 'last_run_at'))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Parts']} title="Biggest Quizzes (last month)">
        {biggestQuizzes.map((q) => (
          <tr key={q.id as number} className="hover:bg-gray-800/50">
            <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
            <td className="px-3 py-2 font-mono text-xs">{q.code as string}</td>
            <td className="px-3 py-2">
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </td>
            <td className="px-3 py-2 font-bold">{q.parts_count as number}</td>
          </tr>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Players', 'Date']} title="Max Players (last 3 days)">
        {maxPlayers.map((q, i) => (
          <tr key={i} className="hover:bg-gray-800/50">
            <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
            <td className="px-3 py-2 font-mono text-xs">{q.code as string}</td>
            <td className="px-3 py-2">
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </td>
            <td className="px-3 py-2 font-bold">{q.players_count as number}</td>
            <td className="px-3 py-2">{formatDate(q.created_at as string)}</td>
          </tr>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Results']} title="Most Results (all time)">
        {mostResults.map((q) => (
          <tr key={q.id as number} className="hover:bg-gray-800/50">
            <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
            <td className="px-3 py-2 font-mono text-xs">
              <Link href={`/results?code=${q.code}`} className="text-blue-400 hover:underline">{q.code as string}</Link>
            </td>
            <td className="px-3 py-2">
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </td>
            <td className="px-3 py-2 font-bold">{q.result_count as number}</td>
          </tr>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Results']} title="Most Results (last week)">
        {mostResultsLastWeek.map((q) => (
          <tr key={q.id as number} className="hover:bg-gray-800/50">
            <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
            <td className="px-3 py-2 font-mono text-xs">
              <Link href={`/results?code=${q.code}`} className="text-blue-400 hover:underline">{q.code as string}</Link>
            </td>
            <td className="px-3 py-2">
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </td>
            <td className="px-3 py-2 font-bold">{q.result_count as number}</td>
          </tr>
        ))}
      </DataTable>

      {/* Player count distribution */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Player Count Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Last 24h</h4>
            <div className="flex flex-wrap gap-1">
              {playerStatsLastDay.map((s: Record<string, unknown>, i: number) => (
                <span key={i} className="bg-gray-800 px-2 py-1 rounded text-xs">
                  {s.players as number}p: <strong>{s.num as number}</strong>
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs text-gray-500 mb-2">All time</h4>
            <div className="flex flex-wrap gap-1">
              {playerStats.slice(0, 30).map((s: Record<string, unknown>, i: number) => (
                <span key={i} className="bg-gray-800 px-2 py-1 rounded text-xs">
                  {s.players as number}p: <strong>{s.num as number}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
