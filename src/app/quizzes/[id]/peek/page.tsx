import { query } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuizPeekPage({ params }: Props) {
  const { id } = await params;
  const [quiz] = await query('SELECT id, name, code, data FROM quizzes WHERE id = $1', [id]);

  if (!quiz) {
    return <div className="text-destructive">Quiz not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/quizzes" className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">{quiz.name as string} <span className="text-muted-foreground font-mono text-sm">{quiz.code as string}</span></h1>
      </div>
      <Card>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap max-h-[80vh] overflow-y-auto">
            {JSON.stringify(quiz.data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
