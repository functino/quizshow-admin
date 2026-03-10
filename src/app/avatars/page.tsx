import { query } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ withImages?: string }>;
}

export default async function AvatarsPage({ searchParams }: Props) {
  const params = await searchParams;
  const withImages = params.withImages === 'true';

  const avatarsLastMonth = await query(`
    SELECT avatar, COUNT(*) as count
    FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 month' AND avatar NOT LIKE 'data%'
    GROUP BY avatar ORDER BY COUNT(*) DESC LIMIT 100
  `);

  const avatarsLastDay = await query(`
    SELECT avatar, COUNT(*) as count
    FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 day' AND avatar NOT LIKE 'data%'
    GROUP BY avatar ORDER BY COUNT(*) DESC LIMIT 100
  `);

  let avatarImages: Record<string, unknown>[] = [];
  if (withImages) {
    avatarImages = await query(`
      SELECT avatar
      FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
      AND avatar LIKE 'data:%'
      ORDER BY updated_at DESC LIMIT 100
    `);
  }

  const renderAvatarUrl = (avatar: string) => {
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    return `https://quiz.sh${avatar}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">Avatars</h1>
        <Link href="/candidates" className="text-sm text-blue-400 hover:underline">Candidates</Link>
        <Link href="/results" className="text-sm text-blue-400 hover:underline">Results</Link>
      </div>

      {/* Custom avatar images */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Avatar Images</h2>
        {withImages ? (
          <div className="flex flex-wrap gap-2">
            {avatarImages.map((a, i) => (
              <img key={i} src={a.avatar as string} alt="" className="w-24 h-24 object-cover rounded-lg" />
            ))}
          </div>
        ) : (
          <Link href="/avatars?withImages=true" className="text-blue-400 hover:underline text-sm">Load Avatar Images</Link>
        )}
      </section>

      {/* Last day */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Avatars Last Day</h2>
        <div className="flex flex-wrap gap-2">
          {avatarsLastDay.map((a: Record<string, unknown>, i: number) => (
            <div key={i} className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1">
              <img src={renderAvatarUrl(a.avatar as string)} alt="" className="w-5 h-5" />
              <span className="text-xs text-gray-400">{a.count as number}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Last month */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Avatars Last Month</h2>
        <div className="flex flex-wrap gap-2">
          {avatarsLastMonth.map((a: Record<string, unknown>, i: number) => (
            <div key={i} className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1">
              <img src={renderAvatarUrl(a.avatar as string)} alt="" className="w-5 h-5" />
              <span className="text-xs text-gray-400">{a.count as number}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
