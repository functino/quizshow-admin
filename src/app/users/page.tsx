import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PlanBadge from '@/components/PlanBadge';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ search?: string; page?: string; page_created?: string; page_quizzes?: string }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || '';
  const page = parseInt(params.page || '1');
  const pageCreated = parseInt(params.page_created || '1');
  const pageQuizzes = parseInt(params.page_quizzes || '1');
  const perPage = 10;

  const ACTIVE_PLAN = `
    LEFT JOIN LATERAL (
      SELECT pl.name as plan_name FROM subscriptions sub
      JOIN plans pl ON sub.plan_id = pl.id
      WHERE sub.user_id = u.id AND sub.canceled_at IS NULL
      AND (sub.expires_at IS NULL OR sub.expires_at > CURRENT_TIMESTAMP)
      ORDER BY pl.amount DESC LIMIT 1
    ) ap ON true`;

  // Last active users (searchable, paginated)
  let lastActiveQuery = `
    SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
           COUNT(q.id) as quiz_count, ap.plan_name
    FROM users u
    LEFT JOIN quizzes q ON q.user_id = u.id
    ${ACTIVE_PLAN}
  `;
  const queryParams: unknown[] = [];
  if (search) {
    lastActiveQuery += ` WHERE u.email ILIKE $1`;
    queryParams.push(`%${search}%`);
  }
  lastActiveQuery += ` GROUP BY u.id, ap.plan_name ORDER BY u.last_active_at DESC NULLS LAST LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(perPage, (page - 1) * perPage);
  const pq = {
    lastActiveUsers: query(lastActiveQuery, queryParams),
    lastCreatedUsers: query(`
      SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
             COUNT(q.id) as quiz_count, ap.plan_name
      FROM users u
      LEFT JOIN quizzes q ON q.user_id = u.id
      ${ACTIVE_PLAN}
      GROUP BY u.id, ap.plan_name
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [perPage, (pageCreated - 1) * perPage]),
    mostQuizzesUsers: query(`
      SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
             COUNT(q.id) as quiz_count, ap.plan_name
      FROM users u
      JOIN quizzes q ON q.user_id = u.id
      ${ACTIVE_PLAN}
      GROUP BY u.id, ap.plan_name
      ORDER BY quiz_count DESC
      LIMIT $1 OFFSET $2
    `, [perPage, (pageQuizzes - 1) * perPage]),
  };

  const lastActiveUsers = await pq.lastActiveUsers;
  const lastCreatedUsers = await pq.lastCreatedUsers;
  const mostQuizzesUsers = await pq.mostQuizzesUsers;

  const renderUserRow = (user: Record<string, unknown>) => (
    <TableRow key={user.id as number}>
      <TableCell>
        <span className="inline-flex items-center gap-1">
          <Link href={`/users/${user.id}`} className="text-primary hover:underline font-medium">
            {(user.name as string) || (user.email as string)}
          </Link>
          <PlanBadge plan={user.plan_name as string} />
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email as string}</TableCell>
      <TableCell>{user.quiz_count as number}</TableCell>
      <TableCell>{formatDate(user.created_at as string)}</TableCell>
      <TableCell>{user.confirmed_at ? formatDate(user.confirmed_at as string) : <span className="text-destructive">unconfirmed</span>}</TableCell>
      <TableCell>{formatDate(user.last_sign_in_at as string)}</TableCell>
      <TableCell>{formatDate(user.last_active_at as string)}</TableCell>
    </TableRow>
  );

  const headers = ['Name', 'Email', 'Quizzes', 'Created', 'Confirmed', 'Signed In', 'Last Active'];

  const buildPageUrl = (paramName: string, pageNum: number) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (paramName === 'page') p.set('page', String(pageNum));
    else if (page > 1) p.set('page', String(page));
    if (paramName === 'page_created') p.set('page_created', String(pageNum));
    else if (pageCreated > 1) p.set('page_created', String(pageCreated));
    if (paramName === 'page_quizzes') p.set('page_quizzes', String(pageNum));
    else if (pageQuizzes > 1) p.set('page_quizzes', String(pageQuizzes));
    return `/users?${p.toString()}`;
  };

  const Pagination = ({ paramName, currentPage, items }: { paramName: string; currentPage: number; items: unknown[] }) => (
    <div className="flex gap-2 text-sm mt-2 items-center">
      {currentPage > 1 && <Link href={buildPageUrl(paramName, currentPage - 1)} className="text-primary hover:underline">&larr; Prev</Link>}
      <span className="text-muted-foreground">Page {currentPage}</span>
      {items.length === perPage && <Link href={buildPageUrl(paramName, currentPage + 1)} className="text-primary hover:underline">Next &rarr;</Link>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex gap-4 items-center">
        <form className="flex gap-2">
          <Input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by email..."
            className="w-64"
          />
          <Button type="submit">Search</Button>
        </form>
        <Link href="/inactive-users" className="text-sm text-primary hover:underline">Inactive Users</Link>
      </div>

      <DataTable headers={headers} title={`Last Active Users${search ? ` (search: "${search}")` : ''}`}>
        {lastActiveUsers.map(renderUserRow)}
      </DataTable>
      <Pagination paramName="page" currentPage={page} items={lastActiveUsers} />

      <DataTable headers={headers} title="Last Created Users">
        {lastCreatedUsers.map(renderUserRow)}
      </DataTable>
      <Pagination paramName="page_created" currentPage={pageCreated} items={lastCreatedUsers} />

      <DataTable headers={headers} title="Most Quizzes Created">
        {mostQuizzesUsers.map(renderUserRow)}
      </DataTable>
      <Pagination paramName="page_quizzes" currentPage={pageQuizzes} items={mostQuizzesUsers} />
    </div>
  );
}
