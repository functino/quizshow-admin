import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import PlanBadge from '@/components/PlanBadge';

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
        u.email as user_email, u.id as user_id, ap.plan_name
    FROM valid_quizzes
    JOIN LATERAL (
        SELECT *
        FROM jsonb_to_recordset(valid_quizzes.filtered_parts) AS parts(id int, type text)
    ) AS parts ON true
    LEFT JOIN users u ON valid_quizzes.user_id = u.id
    LEFT JOIN LATERAL (
        SELECT pl.name as plan_name FROM subscriptions sub
        JOIN plans pl ON sub.plan_id = pl.id
        WHERE sub.user_id = u.id AND sub.canceled_at IS NULL
        AND (sub.expires_at IS NULL OR sub.expires_at > CURRENT_TIMESTAMP)
        ORDER BY pl.amount DESC LIMIT 1
    ) ap ON true
    WHERE parts.type = $1
    GROUP BY valid_quizzes.id, valid_quizzes.name, valid_quizzes.code,
             valid_quizzes.created_at, valid_quizzes.updated_at,
             valid_quizzes.run_count, valid_quizzes.done_count,
             u.email, u.id, ap.plan_name
    ORDER BY MAX(valid_quizzes.created_at) DESC
    LIMIT 10
  `, [type]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/part-types" className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Quizzes with part type: <code className="text-primary">{type}</code></h1>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((q: Record<string, unknown>) => (
                <TableRow key={q.id as number}>
                  <TableCell>{(q.name as string) || '(untitled)'}</TableCell>
                  <TableCell className="font-mono text-xs">{q.code as string}</TableCell>
                  <TableCell>
                    {q.user_id ? (
                      <span className="inline-flex items-center gap-1">
                        <Link href={`/users/${q.user_id}`} className="text-primary hover:underline text-xs">{q.user_email as string}</Link>
                        <PlanBadge plan={q.plan_name as string} />
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(q.created_at as string)}</TableCell>
                  <TableCell>{formatDate(q.updated_at as string)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/quizzes/${q.id}/results`} className="text-primary hover:underline text-xs">[results]</Link>
                    <Link href={`/quizzes/${q.id}/peek`} className="text-primary hover:underline text-xs">[peek]</Link>
                    <Link href={`/quizzes/${q.code}/print`} className="text-primary hover:underline text-xs">[print]</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
