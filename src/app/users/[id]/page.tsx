import { query } from '@/lib/db';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import UserActions from './UserActions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  const users = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (users.length === 0) {
    return <div className="text-red-400">User not found</div>;
  }
  const user = users[0];

  const quizzes = await query(
    'SELECT id, name, code, created_at, updated_at, run_count, done_count, last_run_at FROM quizzes WHERE user_id = $1 ORDER BY updated_at DESC',
    [id],
  );

  const subscriptions = await query(
    `SELECT s.*, p.name as plan_name, p.amount
     FROM subscriptions s
     JOIN plans p ON s.plan_id = p.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [id],
  );

  const hasActiveSubscription = subscriptions.some((s: Record<string, unknown>) => !s.canceled_at);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/users" className="text-gray-400 hover:text-white text-sm">&larr; Back</Link>
        <div>
          <h1 className="text-xl font-bold text-white mb-1">{user.name || user.email}</h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 text-xs uppercase">Created</div>
          <div>{formatDate(user.created_at)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Confirmed</div>
          <div>{user.confirmed_at ? formatDate(user.confirmed_at) : <span className="text-red-400">unconfirmed</span>}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Last Active</div>
          <div>{formatDate(user.last_active_at)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Last Sign In</div>
          <div>{formatDate(user.last_sign_in_at)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Sign In Count</div>
          <div>{user.sign_in_count}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Language</div>
          <div>{user.language || '-'}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Mails Allowed</div>
          <div>{user.mails_allowed ? 'Yes' : 'No'}</div>
        </div>
        {user.plan && (
          <div>
            <div className="text-gray-500 text-xs uppercase">Legacy Plan</div>
            <div className="font-bold text-yellow-400">{user.plan}{user.plan_created_at ? ` (${formatDate(user.plan_created_at)})` : ''}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <UserActions userId={user.id} userName={user.name || ''} hasActiveSubscription={hasActiveSubscription} />

      {/* Gmail link */}
      <div className="text-sm">
        <a href={`https://mail.google.com/mail/u/0/?pli=1#search/${encodeURIComponent(user.email)}`}
           target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          Search in Gmail
        </a>
      </div>

      {/* Subscriptions */}
      {subscriptions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Subscriptions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Expires</th>
                <th className="px-3 py-2 text-left">Canceled</th>
                <th className="px-3 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {subscriptions.map((sub: Record<string, unknown>) => (
                <tr key={sub.id as number}>
                  <td className="px-3 py-2">{sub.plan_name as string}</td>
                  <td className="px-3 py-2">${Number(sub.amount) / 100}</td>
                  <td className="px-3 py-2">{formatDate(sub.created_at as string)}</td>
                  <td className="px-3 py-2">{sub.expires_at ? formatDate(sub.expires_at as string) : '-'}</td>
                  <td className="px-3 py-2">{sub.canceled_at ? formatDate(sub.canceled_at as string) : '-'}</td>
                  <td className="px-3 py-2">{(sub.cancel_reason as string) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Quizzes */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Quizzes ({quizzes.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Runs</th>
              <th className="px-3 py-2 text-left">Done</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Last Run</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {quizzes.map((quiz: Record<string, unknown>) => (
              <tr key={quiz.id as number} className="hover:bg-gray-800/50">
                <td className="px-3 py-2">{(quiz.name as string) || '(untitled)'}</td>
                <td className="px-3 py-2 font-mono text-xs">{quiz.code as string}</td>
                <td className="px-3 py-2">{quiz.run_count as number}</td>
                <td className="px-3 py-2">{quiz.done_count as number}</td>
                <td className="px-3 py-2">{formatDate(quiz.created_at as string)}</td>
                <td className="px-3 py-2">{formatDate(quiz.last_run_at as string)}</td>
                <td className="px-3 py-2 flex gap-2">
                  <Link href={`/quizzes/${quiz.id}/results`} className="text-blue-400 hover:underline text-xs">[r]</Link>
                  <Link href={`/quizzes/${quiz.id}/peek`} className="text-blue-400 hover:underline text-xs">[peek]</Link>
                  <Link href={`/quizzes/${quiz.code}/print`} className="text-blue-400 hover:underline text-xs">[print]</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mail Log */}
      {user.mail_log && user.mail_log.trim() && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Mail Log</h2>
          <pre className="bg-gray-800 p-4 rounded text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {user.mail_log}
          </pre>
        </section>
      )}
    </div>
  );
}
