import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import DataTable from '@/components/DataTable';

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

  // Last active users (searchable, paginated)
  let lastActiveQuery = `
    SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
           COUNT(q.id) as quiz_count
    FROM users u
    LEFT JOIN quizzes q ON q.user_id = u.id
  `;
  const queryParams: unknown[] = [];
  if (search) {
    lastActiveQuery += ` WHERE u.email ILIKE $1`;
    queryParams.push(`%${search}%`);
  }
  lastActiveQuery += ` GROUP BY u.id ORDER BY u.last_active_at DESC NULLS LAST LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(perPage, (page - 1) * perPage);
  const lastActiveUsers = await query(lastActiveQuery, queryParams);

  // Last created users (paginated)
  const lastCreatedUsers = await query(`
    SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
           COUNT(q.id) as quiz_count
    FROM users u
    LEFT JOIN quizzes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `, [perPage, (pageCreated - 1) * perPage]);

  // Most quizzes (paginated)
  const mostQuizzesUsers = await query(`
    SELECT u.id, u.email, u.name, u.created_at, u.confirmed_at, u.last_active_at, u.last_sign_in_at,
           COUNT(q.id) as quiz_count
    FROM users u
    JOIN quizzes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY quiz_count DESC
    LIMIT $1 OFFSET $2
  `, [perPage, (pageQuizzes - 1) * perPage]);

  const renderUserRow = (user: Record<string, unknown>) => (
    <tr key={user.id as number} className="hover:bg-gray-800/50">
      <td className="px-3 py-2">
        <Link href={`/users/${user.id}`} className="text-blue-400 hover:underline">
          {(user.name as string) || (user.email as string)}
        </Link>
      </td>
      <td className="px-3 py-2 text-gray-400">{user.email as string}</td>
      <td className="px-3 py-2">{user.quiz_count as number}</td>
      <td className="px-3 py-2">{formatDate(user.created_at as string)}</td>
      <td className="px-3 py-2">{user.confirmed_at ? formatDate(user.confirmed_at as string) : <span className="text-red-400">unconfirmed</span>}</td>
      <td className="px-3 py-2">{formatDate(user.last_sign_in_at as string)}</td>
      <td className="px-3 py-2">{formatDate(user.last_active_at as string)}</td>
    </tr>
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
    <div className="flex gap-2 text-sm mt-2">
      {currentPage > 1 && <Link href={buildPageUrl(paramName, currentPage - 1)} className="text-blue-400 hover:underline">&larr; Prev</Link>}
      <span className="text-gray-500">Page {currentPage}</span>
      {items.length === perPage && <Link href={buildPageUrl(paramName, currentPage + 1)} className="text-blue-400 hover:underline">Next &rarr;</Link>}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="flex gap-4 items-center">
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by email..."
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">Search</button>
        </form>
        <Link href="/inactive-users" className="text-sm text-blue-400 hover:underline">Inactive Users</Link>
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
