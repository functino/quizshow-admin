import { query } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function QuizPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [quiz] = await query('SELECT * FROM quizzes WHERE code = $1', [id]);
  if (!quiz) return <div className="text-destructive">Quiz not found</div>;

  const pq = {
    versionLog: sp.version ? query('SELECT data FROM quiz_logs WHERE id = $1', [sp.version]) : Promise.resolve([]),
    versions: query('SELECT id, created_at FROM quiz_logs WHERE quiz_id = $1 ORDER BY created_at DESC', [quiz.id]),
  };

  const versionLog = await pq.versionLog;
  const versions = await pq.versions;

  let data = quiz.data as Record<string, unknown>;
  if (versionLog.length > 0) data = versionLog[0].data as Record<string, unknown>;

  const parts = (data.parts as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:text-black print:bg-white">
      <div className="flex items-center gap-4 print:hidden">
        <Link href="/quizzes" className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">{quiz.name as string}</h1>
      </div>

      {versions.length > 0 && (
        <div className="print:hidden">
          <h3 className="text-xs text-muted-foreground mb-2">Versions:</h3>
          <div className="flex flex-wrap gap-2">
            {versions.map((v: Record<string, unknown>) => (
              <Link key={v.id as number} href={`/quizzes/${id}/print?version=${v.id}`}>
                <Badge variant={sp.version === String(v.id) ? 'default' : 'outline'}>
                  {new Date(v.created_at as string).toLocaleDateString('en-GB')}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {parts.map((part, i) => (
          <Card key={i} className="print:border-gray-300">
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">Part {i + 1} &middot; {part.type as string}</div>
              {part.question != null && <div className="font-medium mb-2 print:text-black">{part.question as string}</div>}
              {part.answers != null && Array.isArray(part.answers) && (
                <ul className="list-disc list-inside text-sm text-muted-foreground print:text-gray-700">
                  {(part.answers as Record<string, unknown>[]).map((a, j) => (
                    <li key={j}>{(a.text as string) || JSON.stringify(a)}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
