'use client';
import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { numberWithDelimiter } from '@/lib/format';

const API = 'https://plausible.apps.circa.io/api/v1/stats';
const TOKEN = process.env.NEXT_PUBLIC_PLAUSIBLE_TOKEN || '';
const headers = { Authorization: `Bearer ${TOKEN}` };

async function fetchAggregate(siteId: string, period: string) {
  const res = await fetch(
    `${API}/aggregate?site_id=${siteId}&period=${period}&metrics=visitors,pageviews,bounce_rate,visit_duration`,
    { headers },
  );
  const data = await res.json();
  return data.results as Record<string, { value: number }>;
}

interface AvatarEntry { value: string; events: number }

async function fetchAvatarBreakdown(period: string): Promise<AvatarEntry[]> {
  const res = await fetch(
    `${API}/breakdown?site_id=play.quizshow.io&metrics=events&period=${period}&property=event:props:value&filters=event:name%3D%3DQuizBuzzer__avatarChange`,
    { headers },
  );
  const data = await res.json();
  return (data.results || []) as AvatarEntry[];
}

function avatarUrl(avatar: string) {
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `https://quiz.sh${avatar}`;
}

export default function DashboardTraffic() {
  const [main, setMain] = useState<{ today?: Record<string, { value: number }>; month?: Record<string, { value: number }> }>({});
  const [play, setPlay] = useState<{ today?: Record<string, { value: number }>; month?: Record<string, { value: number }> }>({});
  const [avatars30d, setAvatars30d] = useState<AvatarEntry[]>([]);
  const [avatarsToday, setAvatarsToday] = useState<AvatarEntry[]>([]);

  useEffect(() => {
    fetchAggregate('quizshow.io', 'day').then(r => setMain(prev => ({ ...prev, today: r })));
    fetchAggregate('quizshow.io', '30d').then(r => setMain(prev => ({ ...prev, month: r })));
    fetchAggregate('play.quizshow.io', 'day').then(r => setPlay(prev => ({ ...prev, today: r })));
    fetchAggregate('play.quizshow.io', '30d').then(r => setPlay(prev => ({ ...prev, month: r })));
    fetchAvatarBreakdown('30d').then(setAvatars30d);
    fetchAvatarBreakdown('day').then(setAvatarsToday);
  }, []);

  return (
    <>
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Traffic</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Visitors Today"
            value={main.today ? numberWithDelimiter(main.today.visitors.value) : '...'}
            sub={main.month ? `30d: ${numberWithDelimiter(main.month.visitors.value)}` : ''}
          />
          <StatCard
            label="Pageviews Today"
            value={main.today ? numberWithDelimiter(main.today.pageviews.value) : '...'}
            sub={main.month ? `30d: ${numberWithDelimiter(main.month.pageviews.value)}` : ''}
          />
          <StatCard
            label="Play Visitors Today"
            value={play.today ? numberWithDelimiter(play.today.visitors.value) : '...'}
            sub={play.month ? `30d: ${numberWithDelimiter(play.month.visitors.value)}` : ''}
          />
          <StatCard
            label="Play Pageviews Today"
            value={play.today ? numberWithDelimiter(play.today.pageviews.value) : '...'}
            sub={play.month ? `30d: ${numberWithDelimiter(play.month.pageviews.value)}` : ''}
          />
        </div>
      </section>

      {(avatars30d.length > 0 || avatarsToday.length > 0) && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Avatars</h2>
          {avatarsToday.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted-foreground mb-1">Today:</div>
              <div className="flex flex-wrap gap-1">
                {avatarsToday.slice(0, 50).map((a, i) => (
                  <div key={i} className="flex items-center gap-0.5 bg-muted rounded px-1.5 py-0.5">
                    <img src={avatarUrl(a.value)} alt="" className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">{a.events}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {avatars30d.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Last 30 days:</div>
              <div className="flex flex-wrap gap-1">
                {avatars30d.slice(0, 50).map((a, i) => (
                  <div key={i} className="flex items-center gap-0.5 bg-muted rounded px-1.5 py-0.5">
                    <img src={avatarUrl(a.value)} alt="" className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">{a.events}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
