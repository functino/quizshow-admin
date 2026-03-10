import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ min?: string; page?: string }>;
}

export default async function CandidatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const minCount = parseInt(params.min || '10');
  const page = parseInt(params.page || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const results = await query(`
    SELECT qr.id, qr.data, qr.created_at, qr.quiz_id,
           q.name as quiz_name, q.code as quiz_code,
           u.email as user_email, u.id as user_id
    FROM quiz_results qr
    JOIN quizzes q ON qr.quiz_id = q.id
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE s.id IS NULL
    AND jsonb_array_length(qr.data->'players') > $1
    ORDER BY qr.created_at DESC
    LIMIT $2 OFFSET $3
  `, [minCount, perPage, offset]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">Candidates</h1>
        <span className="text-sm text-gray-400">Non-subscribed users with {minCount}+ players</span>
        <Link href="/results" className="text-sm text-blue-400 hover:underline">Results</Link>
        <Link href="/avatars" className="text-sm text-blue-400 hover:underline">Avatars</Link>
      </div>

      <form className="flex gap-2 items-center">
        <label className="text-sm text-gray-400">Min players:</label>
        <input type="number" name="min" defaultValue={minCount}
               className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-20 focus:outline-none focus:border-blue-500" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">Filter</button>
      </form>

      <div className="space-y-4">
        {results.map((r: Record<string, unknown>) => {
          const data = r.data as Record<string, unknown>;
          const players = (data?.players as Record<string, unknown>[]) || [];
          return (
            <div key={r.id as number} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Link href={`/results?code=${r.quiz_code}`} className="text-blue-400 hover:underline font-mono text-xs">
                    {r.quiz_code as string}
                  </Link>
                  <span className="text-gray-400 text-sm">{r.quiz_name as string}</span>
                  {r.user_id != null && (
                    <Link href={`/users/${r.user_id}`} className="text-gray-500 hover:text-gray-300 text-xs">
                      {r.user_email as string}
                    </Link>
                  )}
                </div>
                <span className="text-gray-500 text-xs">{formatDate(r.created_at as string)}</span>
              </div>
              <div className="text-xs text-gray-400">
                <span className="font-bold text-green-400">{players.length} players</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 text-sm">
        {page > 1 && <Link href={`/candidates?page=${page - 1}&min=${minCount}`} className="text-blue-400 hover:underline">&larr; Previous</Link>}
        <span className="text-gray-500">Page {page}</span>
        {results.length === perPage && <Link href={`/candidates?page=${page + 1}&min=${minCount}`} className="text-blue-400 hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
