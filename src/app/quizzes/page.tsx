import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlanBadge from '@/components/PlanBadge';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function QuizzesPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || '';

  // Subquery to get active plan name for a user
  const ACTIVE_PLAN = `
    LEFT JOIN LATERAL (
      SELECT pl.name as plan_name FROM subscriptions sub
      JOIN plans pl ON sub.plan_id = pl.id
      WHERE sub.user_id = u.id AND sub.canceled_at IS NULL
      AND (sub.expires_at IS NULL OR sub.expires_at > CURRENT_TIMESTAMP)
      ORDER BY pl.amount DESC LIMIT 1
    ) ap ON true`;

  // Fire all queries in parallel
  const p = {
    lastQuizzes: query(`
      SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count, q.done_count, q.last_run_at,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      ORDER BY q.created_at DESC LIMIT 10
    `),
    lastChangedQuizzes: query(`
      SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count, q.done_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      ORDER BY q.updated_at DESC LIMIT 10
    `),
    lastPlayedQuizzes: query(`
      SELECT q.id, q.name, q.code, q.last_run_at, q.run_count, q.done_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      WHERE q.last_run_at IS NOT NULL
      ORDER BY q.last_run_at DESC LIMIT 10
    `),
    biggestQuizzes: query(`
      SELECT q.id, q.name, q.code, q.updated_at, jsonb_array_length(q.data->'parts') as parts_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      WHERE q.updated_at > CURRENT_DATE - INTERVAL '1 month'
      AND q.data->'parts' IS NOT NULL AND jsonb_typeof(q.data->'parts') = 'array'
      ORDER BY parts_count DESC LIMIT 10
    `),
    maxPlayers: query(`
      SELECT q.id, q.name, q.code, jsonb_array_length(qr.data->'players') as players_count,
             u.email as user_email, u.id as user_id, ap.plan_name, qr.created_at
      FROM quiz_results qr
      JOIN quizzes q ON qr.quiz_id = q.id
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      WHERE qr.created_at > CURRENT_DATE - INTERVAL '3 day'
      AND qr.data->'players' IS NOT NULL
      AND jsonb_array_length(qr.data->'players') IS NOT NULL
      ORDER BY players_count DESC LIMIT 10
    `),
    mostResults: query(`
      SELECT q.id, q.name, q.code, COUNT(*) as result_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      GROUP BY q.id, q.name, q.code, u.email, u.id, ap.plan_name
      ORDER BY result_count DESC LIMIT 10
    `),
    mostResultsLastWeek: query(`
      SELECT q.id, q.name, q.code, COUNT(*) as result_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      WHERE qr.created_at > CURRENT_DATE - INTERVAL '1 week'
      GROUP BY q.id, q.name, q.code, u.email, u.id, ap.plan_name
      ORDER BY result_count DESC LIMIT 10
    `),
    playerStats: query(`
      SELECT COUNT(*) as num, jsonb_array_length(data->'players') as players
      FROM quiz_results
      GROUP BY players ORDER BY players DESC
    `),
    playerStatsLastDay: query(`
      SELECT COUNT(*) as num, jsonb_array_length(data->'players') as players
      FROM quiz_results
      WHERE created_at > CURRENT_DATE - INTERVAL '1 day'
      GROUP BY players ORDER BY players DESC
    `),
  };

  const lastQuizzes = await p.lastQuizzes;
  const lastChangedQuizzes = await p.lastChangedQuizzes;
  const lastPlayedQuizzes = await p.lastPlayedQuizzes;
  const biggestQuizzes = await p.biggestQuizzes;
  const maxPlayers = await p.maxPlayers;
  const mostResults = await p.mostResults;
  const mostResultsLastWeek = await p.mostResultsLastWeek;
  const playerStats = await p.playerStats;
  const playerStatsLastDay = await p.playerStatsLastDay;

  let searchResults: Record<string, unknown>[] = [];
  if (search) {
    searchResults = await query(`
      SELECT q.id, q.name, q.code, q.created_at, q.updated_at, q.run_count,
             u.email as user_email, u.id as user_id, ap.plan_name
      FROM quizzes q
      LEFT JOIN users u ON q.user_id = u.id
      ${ACTIVE_PLAN}
      WHERE q.name ILIKE $1
      ORDER BY q.updated_at DESC LIMIT 20
    `, [`%${search}%`]);
  }

  const quizHeaders = ['Name', 'Code', 'User', 'Runs', 'Done', 'Date'];

  const renderQuizRow = (q: Record<string, unknown>, dateField: string = 'created_at') => (
    <TableRow key={`${q.id}-${dateField}`}>
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
      <TableCell>{q.run_count as number}</TableCell>
      <TableCell>{q.done_count as number}</TableCell>
      <TableCell>{formatDate(q[dateField] as string)}</TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-8">
      <form className="flex gap-2">
        <Input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search quiz by name..."
          className="w-64"
        />
        <Button type="submit">Search</Button>
      </form>

      {search && (
        <DataTable headers={quizHeaders} title={`Search results for "${search}"`}>
          {searchResults.map((q) => renderQuizRow(q, 'updated_at'))}
          {searchResults.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No results</TableCell></TableRow>}
        </DataTable>
      )}

      <DataTable headers={quizHeaders} title="Last Created">
        {lastQuizzes.map((q) => renderQuizRow(q))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Runs', 'Done', 'Updated']} title="Last Changed">
        {lastChangedQuizzes.map((q) => renderQuizRow(q, 'updated_at'))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Runs', 'Done', 'Last Played']} title="Last Played">
        {lastPlayedQuizzes.map((q) => renderQuizRow(q, 'last_run_at'))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Parts']} title="Biggest Quizzes (last month)">
        {biggestQuizzes.map((q) => (
          <TableRow key={q.id as number}>
            <TableCell>{(q.name as string) || '(untitled)'}</TableCell>
            <TableCell className="font-mono text-xs">{q.code as string}</TableCell>
            <TableCell>
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-primary hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </TableCell>
            <TableCell className="font-bold">{q.parts_count as number}</TableCell>
          </TableRow>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Players', 'Date']} title="Max Players (last 3 days)">
        {maxPlayers.map((q, i) => (
          <TableRow key={i}>
            <TableCell>{(q.name as string) || '(untitled)'}</TableCell>
            <TableCell className="font-mono text-xs">{q.code as string}</TableCell>
            <TableCell>
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-primary hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </TableCell>
            <TableCell className="font-bold">{q.players_count as number}</TableCell>
            <TableCell>{formatDate(q.created_at as string)}</TableCell>
          </TableRow>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Results']} title="Most Results (all time)">
        {mostResults.map((q) => (
          <TableRow key={q.id as number}>
            <TableCell>{(q.name as string) || '(untitled)'}</TableCell>
            <TableCell className="font-mono text-xs">
              <Link href={`/results?code=${q.code}`} className="text-primary hover:underline">{q.code as string}</Link>
            </TableCell>
            <TableCell>
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-primary hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </TableCell>
            <TableCell className="font-bold">{q.result_count as number}</TableCell>
          </TableRow>
        ))}
      </DataTable>

      <DataTable headers={['Name', 'Code', 'User', 'Results']} title="Most Results (last week)">
        {mostResultsLastWeek.map((q) => (
          <TableRow key={q.id as number}>
            <TableCell>{(q.name as string) || '(untitled)'}</TableCell>
            <TableCell className="font-mono text-xs">
              <Link href={`/results?code=${q.code}`} className="text-primary hover:underline">{q.code as string}</Link>
            </TableCell>
            <TableCell>
              {q.user_id ? <Link href={`/users/${q.user_id}`} className="text-primary hover:underline text-xs">{q.user_email as string}</Link> : '-'}
            </TableCell>
            <TableCell className="font-bold">{q.result_count as number}</TableCell>
          </TableRow>
        ))}
      </DataTable>

      {/* Player count distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Player Count Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">Last 24h</h4>
              <div className="flex flex-wrap gap-1">
                {playerStatsLastDay.map((s: Record<string, unknown>, i: number) => (
                  <Badge key={i} variant="secondary">
                    {s.players as number}p: <strong>{s.num as number}</strong>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">All time</h4>
              <div className="flex flex-wrap gap-1">
                {playerStats.slice(0, 30).map((s: Record<string, unknown>, i: number) => (
                  <Badge key={i} variant="secondary">
                    {s.players as number}p: <strong>{s.num as number}</strong>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
