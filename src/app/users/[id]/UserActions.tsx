'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      {msg && <div className="text-sm text-primary font-medium">{msg}</div>}

      <div className="flex gap-2 items-center">
        <label className="text-sm text-muted-foreground">Name:</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64"
        />
        <Button onClick={handleSaveName} disabled={saving} size="sm">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {hasActiveSubscription && (
        <Button onClick={handleUnsubscribe} variant="destructive" size="sm">
          Cancel Subscription
        </Button>
      )}

      <form method="POST" action={`https://www.quizshow.io/users/${userId}/become`} target="_blank">
        <input type="hidden" name="secret" value={process.env.NEXT_PUBLIC_IMPERSONATE_SECRET || ''} />
        <Button type="submit" variant="outline" size="sm">
          Login as this user
        </Button>
      </form>
    </div>
  );
}
