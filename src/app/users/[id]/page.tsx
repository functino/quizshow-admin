import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import UserActions from './UserActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  const users = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (users.length === 0) {
    return <div className="text-destructive">User not found</div>;
  }
  const user = users[0];

  const pq = {
    quizzes: query(
      'SELECT id, name, code, created_at, updated_at, run_count, done_count, last_run_at FROM quizzes WHERE user_id = $1 ORDER BY updated_at DESC',
      [id],
    ),
    subscriptions: query(
      `SELECT s.*, p.name as plan_name, p.amount
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [id],
    ),
  };

  const quizzes = await pq.quizzes;
  const subscriptions = await pq.subscriptions;

  const hasActiveSubscription = subscriptions.some((s: Record<string, unknown>) => !s.canceled_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users" className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</Link>
        <div>
          <h1 className="text-xl font-semibold">{user.name || user.email}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Created</div>
              <div>{formatDate(user.created_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Confirmed</div>
              <div>{user.confirmed_at ? formatDate(user.confirmed_at) : <Badge variant="destructive">unconfirmed</Badge>}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Last Active</div>
              <div>{formatDate(user.last_active_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Last Sign In</div>
              <div>{formatDate(user.last_sign_in_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Sign In Count</div>
              <div>{user.sign_in_count}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Language</div>
              <div>{user.language || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Mails Allowed</div>
              <div>{user.mails_allowed ? 'Yes' : 'No'}</div>
            </div>
            {user.plan && (
              <div>
                <div className="text-muted-foreground text-xs uppercase">Legacy Plan</div>
                <div><Badge variant="outline">{user.plan}{user.plan_created_at ? ` (${formatDate(user.plan_created_at)})` : ''}</Badge></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UserActions userId={user.id} userName={user.name || ''} hasActiveSubscription={hasActiveSubscription} />

      <div className="text-sm">
        <a href={`https://mail.google.com/mail/u/0/?pli=1#search/${encodeURIComponent(user.email)}`}
           target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Search in Gmail
        </a>
      </div>

      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Canceled</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: Record<string, unknown>) => (
                  <TableRow key={sub.id as number}>
                    <TableCell>{sub.plan_name as string}</TableCell>
                    <TableCell>${Number(sub.amount) / 100}</TableCell>
                    <TableCell>{formatDate(sub.created_at as string)}</TableCell>
                    <TableCell>{sub.expires_at ? formatDate(sub.expires_at as string) : '-'}</TableCell>
                    <TableCell>{sub.canceled_at ? formatDate(sub.canceled_at as string) : '-'}</TableCell>
                    <TableCell>{(sub.cancel_reason as string) || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quizzes ({quizzes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Done</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz: Record<string, unknown>) => (
                <TableRow key={quiz.id as number}>
                  <TableCell>{(quiz.name as string) || '(untitled)'}</TableCell>
                  <TableCell className="font-mono text-xs">{quiz.code as string}</TableCell>
                  <TableCell>{quiz.run_count as number}</TableCell>
                  <TableCell>{quiz.done_count as number}</TableCell>
                  <TableCell>{formatDate(quiz.created_at as string)}</TableCell>
                  <TableCell>{formatDate(quiz.last_run_at as string)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Link href={`/quizzes/${quiz.id}/results`} className="text-primary hover:underline text-xs">[r]</Link>
                    <Link href={`/quizzes/${quiz.id}/peek`} className="text-primary hover:underline text-xs">[peek]</Link>
                    <Link href={`/quizzes/${quiz.code}/print`} className="text-primary hover:underline text-xs">[print]</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {user.mail_log && user.mail_log.trim() && (
        <Card>
          <CardHeader>
            <CardTitle>Mail Log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
              {user.mail_log}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
