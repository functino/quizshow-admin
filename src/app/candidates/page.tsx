import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
        <h1 className="text-lg font-semibold">Candidates</h1>
        <span className="text-sm text-muted-foreground">Non-subscribed users with {minCount}+ players</span>
        <Link href="/results" className="text-sm text-primary hover:underline">Results</Link>
        <Link href="/avatars" className="text-sm text-primary hover:underline">Avatars</Link>
      </div>

      <form className="flex gap-2 items-center">
        <label className="text-sm text-muted-foreground">Min players:</label>
        <Input type="number" name="min" defaultValue={minCount} className="w-20" />
        <Button type="submit" size="sm">Filter</Button>
      </form>

      <div className="space-y-3">
        {results.map((r: Record<string, unknown>) => {
          const data = r.data as Record<string, unknown>;
          const players = (data?.players as Record<string, unknown>[]) || [];
          return (
            <Card key={r.id as number}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/results?code=${r.quiz_code}`} className="text-primary hover:underline font-mono text-xs">
                      {r.quiz_code as string}
                    </Link>
                    <span className="text-muted-foreground text-sm">{r.quiz_name as string}</span>
                    {r.user_id != null && (
                      <Link href={`/users/${r.user_id}`} className="text-muted-foreground hover:text-foreground text-xs">
                        {r.user_email as string}
                      </Link>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">{formatDate(r.created_at as string)}</span>
                </div>
                <Badge variant="secondary">{players.length} players</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 text-sm items-center">
        {page > 1 && <Link href={`/candidates?page=${page - 1}&min=${minCount}`} className="text-primary hover:underline">&larr; Previous</Link>}
        <span className="text-muted-foreground">Page {page}</span>
        {results.length === perPage && <Link href={`/candidates?page=${page + 1}&min=${minCount}`} className="text-primary hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
