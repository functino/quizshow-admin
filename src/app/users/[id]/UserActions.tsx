'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: number;
  userName: string;
  hasActiveSubscription: boolean;
}

export default function UserActions({ userId, userName, hasActiveSubscription }: Props) {
  const router = useRouter();
  const [name, setName] = useState(userName || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSaveName = async () => {
    setSaving(true);
    setMsg('');
    const res = await fetch(`/api/users/${userId}/name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Name saved!' : 'Error saving');
    if (res.ok) router.refresh();
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Cancel all active subscriptions for this user?')) return;
    const res = await fetch(`/api/users/${userId}/unsubscribe`, { method: 'POST' });
    setMsg(res.ok ? 'Subscriptions canceled!' : 'Error canceling');
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      {msg && <div className="text-sm text-green-400">{msg}</div>}

      {/* Name edit */}
      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-400">Name:</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button onClick={handleSaveName} disabled={saving}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Cancel subscription */}
      {hasActiveSubscription && (
        <button onClick={handleUnsubscribe}
                className="bg-red-700 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600">
          Cancel Subscription
        </button>
      )}

      {/* Become user (impersonate via Rails) */}
      <form method="POST" action={`https://www.quizshow.io/users/${userId}/become`} target="_blank">
        <input type="hidden" name="secret" value="RTUILM40" />
        <button type="submit"
                className="bg-yellow-700 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-600">
          Login as this user
        </button>
      </form>
    </div>
  );
}
