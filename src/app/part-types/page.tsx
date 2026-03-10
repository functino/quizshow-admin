import { query } from '@/lib/db';
import { numberWithDelimiter } from '@/lib/format';
import Link from 'next/link';
import PartTypesChart from './PartTypesChart';

export const dynamic = 'force-dynamic';

export default async function PartTypesPage() {
  // Part types (all time)
  const partTypes = await query(`
    SELECT elements->>'type' as type, COUNT(*) as count
    FROM quizzes, jsonb_array_elements(data->'parts') as elements
    GROUP BY elements->>'type'
    ORDER BY COUNT(*) DESC
  `);

  // Part types (last month)
  const partTypesLastMonth = await query(`
    SELECT elements->>'type' as type, COUNT(*) as count
    FROM quizzes, jsonb_array_elements(data->'parts') as elements
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
    GROUP BY elements->>'type'
    ORDER BY COUNT(*) DESC
  `);

  // Quiz part types (distinct quizzes using each type)
  const quizPartTypes = await query(`
    SELECT type, COUNT(*) FROM (
      SELECT quizzes.id, elements->>'type' as type, COUNT(*) as count
      FROM quizzes, jsonb_array_elements(data->'parts') as elements
      GROUP BY type, quizzes.id
      ORDER BY quizzes.id, COUNT(*) DESC
    ) as base
    GROUP BY type
    ORDER BY COUNT(*) DESC
  `);

  const quizPartTypesLastMonth = await query(`
    SELECT type, COUNT(*) FROM (
      SELECT quizzes.id, elements->>'type' as type, COUNT(*) as count
      FROM quizzes, jsonb_array_elements(data->'parts') as elements
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
      GROUP BY type, quizzes.id
      ORDER BY quizzes.id, COUNT(*) DESC
    ) as base
    GROUP BY type
    ORDER BY COUNT(*) DESC
  `);

  // Part types graph (12 months, by day)
  const partTypesGraph = await query(`
    SELECT elements->>'type' as type, DATE_TRUNC('month', created_at) as date, COUNT(*) as count
    FROM quizzes, jsonb_array_elements(data->'parts') as elements
    WHERE created_at > CURRENT_DATE - INTERVAL '12 month'
    GROUP BY elements->>'type', DATE_TRUNC('month', created_at)
    ORDER BY date, COUNT(*) DESC
  `);

  // Fabularasa entries
  const fabularasa = await query(`
    SELECT elements->>'id' as id, elements->>'type' as type,
           elements->>'question' as question, elements->>'answer' as answer
    FROM quizzes, jsonb_array_elements(data->'parts') as elements
    WHERE elements->>'type' = 'fabularasa'
    ORDER BY created_at DESC LIMIT 100
  `);

  const [{ count: quizCount }] = await query('SELECT COUNT(*) as count FROM quizzes');

  const totalParts = partTypes.reduce((sum: number, pt: Record<string, unknown>) => sum + Number(pt.count), 0);
  const totalPartsLastMonth = partTypesLastMonth.reduce((sum: number, pt: Record<string, unknown>) => sum + Number(pt.count), 0);

  // Build lookup maps
  const lastMonthMap = new Map(partTypesLastMonth.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));
  const quizTypeMap = new Map(quizPartTypes.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));
  const quizTypeLastMonthMap = new Map(quizPartTypesLastMonth.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));

  // Prepare chart data
  const chartData = partTypesGraph.map((r: Record<string, unknown>) => ({
    type: r.type as string,
    date: new Date(r.date as string).getTime(),
    count: Number(r.count),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold text-white">Part Types</h1>
        <span className="text-sm text-gray-400">
          Total parts: {numberWithDelimiter(totalParts)} | Last month: {numberWithDelimiter(totalPartsLastMonth)} | Quizzes: {numberWithDelimiter(Number(quizCount))}
        </span>
      </div>

      {/* 12-month chart */}
      <PartTypesChart data={chartData} types={partTypes.slice(0, 10).map((pt: Record<string, unknown>) => pt.type as string)} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Parts (all)</th>
              <th className="px-3 py-2 text-right">Parts (30d)</th>
              <th className="px-3 py-2 text-right">%</th>
              <th className="px-3 py-2 text-right">Quizzes (all)</th>
              <th className="px-3 py-2 text-right">Quizzes (30d)</th>
              <th className="px-3 py-2 text-left">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {partTypes.map((pt: Record<string, unknown>) => {
              const count = Number(pt.count);
              const pct = totalParts > 0 ? ((count / totalParts) * 100).toFixed(1) : '0';
              const barWidth = totalParts > 0 ? (count / totalParts) * 100 : 0;
              return (
                <tr key={pt.type as string} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2 font-mono text-xs font-bold">
                    <Link href={`/part-types/${pt.type}`} className="text-blue-400 hover:underline">
                      {pt.type as string}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">{numberWithDelimiter(count)}</td>
                  <td className="px-3 py-2 text-right">{numberWithDelimiter(lastMonthMap.get(pt.type as string) || 0)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{pct}%</td>
                  <td className="px-3 py-2 text-right">{numberWithDelimiter(quizTypeMap.get(pt.type as string) || 0)}</td>
                  <td className="px-3 py-2 text-right">{numberWithDelimiter(quizTypeLastMonthMap.get(pt.type as string) || 0)}</td>
                  <td className="px-3 py-2">
                    <div className="w-48 bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 rounded-full h-2" style={{ width: `${barWidth}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fabularasa section */}
      {fabularasa.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Fabularasa Entries</h2>
          <div className="space-y-2">
            {fabularasa.map((f: Record<string, unknown>, i: number) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded px-3 py-2 text-sm">
                <span className="text-white">{f.question as string}</span>
                {f.answer != null && <span className="text-gray-400 ml-2">→ {f.answer as string}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
