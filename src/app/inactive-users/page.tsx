import { query } from '@/lib/db';
import { formatDate, timeAgo } from '@/lib/format';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

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
      <h1 className="text-lg font-semibold">Inactive Users (unconfirmed)</h1>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveUsers.map((u: Record<string, unknown>) => (
                <TableRow key={u.id as number}>
                  <TableCell>
                    <Link href={`/users/${u.id}`} className="text-primary hover:underline">{u.email as string}</Link>
                  </TableCell>
                  <TableCell title={formatDate(u.created_at as string)}>
                    {timeAgo(u.created_at as string)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-2 text-sm items-center">
        {page > 1 && <Link href={`/inactive-users?page=${page - 1}`} className="text-primary hover:underline">&larr; Previous</Link>}
        <span className="text-muted-foreground">Page {page}</span>
        {inactiveUsers.length === perPage && <Link href={`/inactive-users?page=${page + 1}`} className="text-primary hover:underline">Next &rarr;</Link>}
      </div>
    </div>
  );
}
