import { query } from '@/lib/db';
import { formatDate, timeAgo } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function InactiveUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const inactiveUsers = await query(`
    SELECT id, email, created_at
    FROM users
    WHERE confirmed_at IS NULL
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, [perPage, offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-white">Inactive Users (unconfirmed)</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {inactiveUsers.map((u: Record<string, unknown>) => (
              <tr key={u.id as number} className="hover:bg-gray-800/50">
                <td className="px-3 py-2">
                  <Link href={`/users/${u.id}`} className="text-blue-400 hover:underline">{u.email as string}</Link>
                </td>
                <td className="px-3 py-2" title={formatDate(u.created_at as string)}>
                  {timeAgo(u.created_at as string)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-sm">
        {page > 1 && <Link href={`/inactive-users?page=${page - 1}`} className="text-blue-400 hover:underline">&larr; Previous</Link>}
        <span className="text-gray-500">Page {page}</span>
        {inactiveUsers.length === perPage && <Link href={`/inactive-users?page=${page + 1}`} className="text-blue-400 hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
