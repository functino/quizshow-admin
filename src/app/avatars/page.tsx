import { query } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ withImages?: string }>;
}

export default async function AvatarsPage({ searchParams }: Props) {
  const params = await searchParams;
  const withImages = params.withImages === 'true';

  const p = {
    avatarsLastMonth: query(`
      SELECT avatar, COUNT(*) as count
      FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 month' AND avatar NOT LIKE 'data%'
      GROUP BY avatar ORDER BY COUNT(*) DESC LIMIT 100
    `),
    avatarsLastDay: query(`
      SELECT avatar, COUNT(*) as count
      FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 day' AND avatar NOT LIKE 'data%'
      GROUP BY avatar ORDER BY COUNT(*) DESC LIMIT 100
    `),
    avatarImages: withImages ? query(`
      SELECT avatar
      FROM quiz_results, jsonb_to_recordset(data->'players') AS x(avatar text)
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
      AND avatar LIKE 'data:%'
      ORDER BY updated_at DESC LIMIT 100
    `) : Promise.resolve([] as Record<string, unknown>[]),
  };

  const avatarsLastMonth = await p.avatarsLastMonth;
  const avatarsLastDay = await p.avatarsLastDay;
  const avatarImages = await p.avatarImages;

  const renderAvatarUrl = (avatar: string) => {
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    return `https://quiz.sh${avatar}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Avatars</h1>
        <Link href="/candidates" className="text-sm text-primary hover:underline">Candidates</Link>
        <Link href="/results" className="text-sm text-primary hover:underline">Results</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar Images</CardTitle>
        </CardHeader>
        <CardContent>
          {withImages ? (
            <div className="flex flex-wrap gap-2">
              {avatarImages.map((a, i) => (
                <img key={i} src={a.avatar as string} alt="" className="w-24 h-24 object-cover rounded-lg" />
              ))}
            </div>
          ) : (
            <Link href="/avatars?withImages=true" className="text-primary hover:underline text-sm">Load Avatar Images</Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avatars Last Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {avatarsLastDay.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                <img src={renderAvatarUrl(a.avatar as string)} alt="" className="w-5 h-5" />
                <span className="text-xs text-muted-foreground">{a.count as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avatars Last Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {avatarsLastMonth.map((a: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                <img src={renderAvatarUrl(a.avatar as string)} alt="" className="w-5 h-5" />
                <span className="text-xs text-muted-foreground">{a.count as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
