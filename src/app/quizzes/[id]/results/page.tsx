import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuizResultsPage({ params }: Props) {
  const { id } = await params;
  const pq = {
    quiz: query('SELECT id, name, code FROM quizzes WHERE id = $1', [id]),
    results: query('SELECT * FROM quiz_results WHERE quiz_id = $1 ORDER BY created_at DESC', [id]),
  };

  const [quiz] = await pq.quiz;
  const results = await pq.results;

  if (!quiz) {
    return <div className="text-destructive">Quiz not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/quizzes" className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Results for: {quiz.name as string}</h1>
      </div>

      <div className="space-y-3">
        {results.map((r: Record<string, unknown>) => {
          const data = r.data as Record<string, unknown>;
          const players = (data?.players as Record<string, unknown>[]) || [];
          return (
            <Card key={r.id as number}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at as string)}</span>
                  <Badge variant="secondary">{players.length} players</Badge>
                </div>
                {players.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {players.map((p, i) => (
                      <Badge key={i} variant="outline">
                        {(p.name as string) || `Player ${i + 1}`}
                        {p.points != null && <span className="text-muted-foreground ml-1">({p.points as number}pts)</span>}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
