import { query } from '@/lib/db';

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
      <h1 className="text-lg font-bold text-white">No Offense</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Prompt</th>
              <th className="px-3 py-2 text-left" colSpan={2}>Answers</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((p: Record<string, unknown>, i: number) => {
              const totalVotes = Number(p.votes1 || 0) + Number(p.votes2 || 0);
              const pct1 = totalVotes > 0 ? Math.round((Number(p.votes1 || 0) / totalVotes) * 100) : 0;
              const pct2 = totalVotes > 0 ? Math.round((Number(p.votes2 || 0) / totalVotes) * 100) : 0;
              const date = p.prompt_date
                ? new Date(Number(p.prompt_date)).toLocaleString('en-GB')
                : '-';

              return (
                <tr key={i} className="border-b border-gray-800">
                  <td className="px-3 py-2" colSpan={2}>
                    <div className="font-bold text-white">{p.prompt as string}</div>
                    <div className="text-xs text-gray-500 mt-1">Shown: {date}</div>
                  </td>
                  <td className="px-3 py-2" colSpan={2}>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-gray-800/50 p-2 rounded">
                        <div>{p.answer1 as string}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {p.votes1 as number} votes ({pct1}%)
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-2 rounded">
                        <div>{p.answer2 as string}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {p.votes2 as number} votes ({pct2}%)
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
