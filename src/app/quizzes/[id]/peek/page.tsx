import { query } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuizPeekPage({ params }: Props) {
  const { id } = await params;
  const [quiz] = await query('SELECT id, name, code, data FROM quizzes WHERE id = $1', [id]);

  if (!quiz) {
    return <div className="text-red-400">Quiz not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/quizzes" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
        <h1 className="text-lg font-bold text-white">{quiz.name as string} <span className="text-gray-400 font-mono text-sm">{quiz.code as string}</span></h1>
      </div>
      <pre className="bg-gray-800 p-4 rounded-lg text-xs text-gray-300 overflow-x-auto max-h-[80vh] overflow-y-auto">
        {JSON.stringify(quiz.data, null, 2)}
      </pre>
    </div>
  );
}
