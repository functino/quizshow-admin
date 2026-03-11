import { query } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ limit?: string }>;
}

export default async function OffensePage({ searchParams }: Props) {
  const params = await searchParams;
  const limit = parseInt(params.limit || '50');

  const prompts = await query(`
    SELECT
        prompt ->> 'text' AS prompt,
        answers->0->>'text' AS answer1,
        jsonb_array_length(answers->0->'votes') AS votes1,
        answers->1->>'text' AS answer2,
        jsonb_array_length(answers->1->'votes') AS votes2,
        data->>'startTime' AS prompt_date
    FROM (
        SELECT jsonb_array_elements(data->'partResultData'->'prompts') AS prompt, data
        FROM quiz_events
        WHERE data->'partResultData'->'prompts' IS NOT NULL
        ORDER BY id DESC
        LIMIT $1
    ) AS prompts_data
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(a) AS answers
        FROM jsonb_array_elements(prompts_data.prompt->'answers') AS a
    ) AS answers_data ON true
  `, [limit]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">No Offense</h1>

      <div className="space-y-3">
        {prompts.map((p: Record<string, unknown>, i: number) => {
          const totalVotes = Number(p.votes1 || 0) + Number(p.votes2 || 0);
          const pct1 = totalVotes > 0 ? Math.round((Number(p.votes1 || 0) / totalVotes) * 100) : 0;
          const pct2 = totalVotes > 0 ? Math.round((Number(p.votes2 || 0) / totalVotes) * 100) : 0;
          const date = p.prompt_date
            ? new Date(Number(p.prompt_date)).toLocaleString('en-GB')
            : '-';

          return (
            <Card key={i}>
              <CardContent>
                <div className="font-medium mb-1">{p.prompt as string}</div>
                <div className="text-xs text-muted-foreground mb-3">Shown: {date}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm">{p.answer1 as string}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.votes1 as number} votes ({pct1}%)
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm">{p.answer2 as string}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.votes2 as number} votes ({pct2}%)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
