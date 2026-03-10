import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuizResultsPage({ params }: Props) {
  const { id } = await params;
  const [quiz] = await query('SELECT id, name, code FROM quizzes WHERE id = $1', [id]);
  const results = await query('SELECT * FROM quiz_results WHERE quiz_id = $1 ORDER BY created_at DESC', [id]);

  if (!quiz) {
    return <div className="text-red-400">Quiz not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/quizzes" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
        <h1 className="text-lg font-bold text-white">Results for: {quiz.name as string}</h1>
      </div>

      <div className="space-y-4">
        {results.map((r: Record<string, unknown>) => {
          const data = r.data as Record<string, unknown>;
          const players = (data?.players as Record<string, unknown>[]) || [];
          return (
            <div key={r.id as number} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{formatDate(r.created_at as string)}</span>
                <span className="text-xs text-gray-500">{players.length} players</span>
              </div>
              {players.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <span key={i} className="bg-gray-700 px-2 py-0.5 rounded text-xs">
                      {(p.name as string) || `Player ${i + 1}`}
                      {p.points != null && <span className="text-gray-400 ml-1">({p.points as number}pts)</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
