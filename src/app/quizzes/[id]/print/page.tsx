import { query } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function QuizPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [quiz] = await query('SELECT * FROM quizzes WHERE code = $1', [id]);
  if (!quiz) return <div className="text-red-400">Quiz not found</div>;

  let data = quiz.data as Record<string, unknown>;

  // Load specific version if requested
  if (sp.version) {
    const [log] = await query('SELECT data FROM quiz_logs WHERE id = $1', [sp.version]);
    if (log) data = log.data as Record<string, unknown>;
  }

  // Load version history
  const versions = await query(
    'SELECT id, created_at FROM quiz_logs WHERE quiz_id = $1 ORDER BY created_at DESC',
    [quiz.id],
  );

  const parts = (data.parts as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:text-black print:bg-white">
      <div className="flex items-center gap-4 print:hidden">
        <Link href="/quizzes" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
        <h1 className="text-lg font-bold text-white">{quiz.name as string}</h1>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-1 rounded text-sm">Print</button>
      </div>

      {/* Version history */}
      {versions.length > 0 && (
        <div className="print:hidden">
          <h3 className="text-xs text-gray-400 mb-2">Versions:</h3>
          <div className="flex flex-wrap gap-2">
            {versions.map((v: Record<string, unknown>) => (
              <Link key={v.id as number} href={`/quizzes/${id}/print?version=${v.id}`}
                    className={`text-xs px-2 py-1 rounded ${sp.version === String(v.id) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {new Date(v.created_at as string).toLocaleDateString('en-GB')}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quiz content */}
      <div className="space-y-6">
        {parts.map((part, i) => (
          <div key={i} className="border border-gray-700 rounded-lg p-4 print:border-gray-300">
            <div className="text-xs text-gray-500 mb-1">Part {i + 1} &middot; {part.type as string}</div>
            {part.question != null && <div className="text-white font-bold mb-2 print:text-black">{part.question as string}</div>}
            {part.answers != null && Array.isArray(part.answers) && (
              <ul className="list-disc list-inside text-sm text-gray-300 print:text-gray-700">
                {(part.answers as Record<string, unknown>[]).map((a, j) => (
                  <li key={j}>{(a.text as string) || JSON.stringify(a)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
