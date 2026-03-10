import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ type: string }>;
}

export default async function PartTypeDetailPage({ params }: Props) {
  const { type } = await params;

  const quizzes = await query(`
    WITH valid_quizzes AS (
        SELECT *,
               jsonb_path_query_array(data->'parts', '$[*] ? (@ != null)') AS filtered_parts
        FROM quizzes
        WHERE jsonb_typeof(data->'parts') = 'array' AND data->'parts' IS NOT NULL
    )
    SELECT
        valid_quizzes.id, valid_quizzes.name, valid_quizzes.code,
        valid_quizzes.created_at, valid_quizzes.updated_at,
        valid_quizzes.run_count, valid_quizzes.done_count,
        u.email as user_email, u.id as user_id
    FROM valid_quizzes
    JOIN LATERAL (
        SELECT *
        FROM jsonb_to_recordset(valid_quizzes.filtered_parts) AS parts(id int, type text)
    ) AS parts ON true
    LEFT JOIN users u ON valid_quizzes.user_id = u.id
    WHERE parts.type = $1
    GROUP BY valid_quizzes.id, valid_quizzes.name, valid_quizzes.code,
             valid_quizzes.created_at, valid_quizzes.updated_at,
             valid_quizzes.run_count, valid_quizzes.done_count,
             u.email, u.id
    ORDER BY MAX(valid_quizzes.created_at) DESC
    LIMIT 10
  `, [type]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/part-types" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
        <h1 className="text-lg font-bold text-white">Quizzes with part type: <code className="text-blue-400">{type}</code></h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {quizzes.map((q: Record<string, unknown>) => (
              <tr key={q.id as number} className="hover:bg-gray-800/50">
                <td className="px-3 py-2">{(q.name as string) || '(untitled)'}</td>
                <td className="px-3 py-2 font-mono text-xs">{q.code as string}</td>
                <td className="px-3 py-2">
                  {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-blue-400 hover:underline text-xs">{q.user_email as string}</Link> : '-'}
                </td>
                <td className="px-3 py-2">{formatDate(q.created_at as string)}</td>
                <td className="px-3 py-2">{formatDate(q.updated_at as string)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
