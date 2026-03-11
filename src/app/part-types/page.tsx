import { query } from '@/lib/db';
import { numberWithDelimiter } from '@/lib/format';
import Link from 'next/link';
import PartTypesChart from './PartTypesChart';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function PartTypesPage() {
  const p = {
    partTypes: query(`
      SELECT elements->>'type' as type, COUNT(*) as count
      FROM quizzes, jsonb_array_elements(data->'parts') as elements
      GROUP BY elements->>'type'
      ORDER BY COUNT(*) DESC
    `),
    partTypesLastMonth: query(`
      SELECT elements->>'type' as type, COUNT(*) as count
      FROM quizzes, jsonb_array_elements(data->'parts') as elements
      WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
      GROUP BY elements->>'type'
      ORDER BY COUNT(*) DESC
    `),
    quizPartTypes: query(`
      SELECT type, COUNT(*) FROM (
        SELECT quizzes.id, elements->>'type' as type, COUNT(*) as count
        FROM quizzes, jsonb_array_elements(data->'parts') as elements
        GROUP BY type, quizzes.id
        ORDER BY quizzes.id, COUNT(*) DESC
      ) as base
      GROUP BY type
      ORDER BY COUNT(*) DESC
    `),
    quizPartTypesLastMonth: query(`
      SELECT type, COUNT(*) FROM (
        SELECT quizzes.id, elements->>'type' as type, COUNT(*) as count
        FROM quizzes, jsonb_array_elements(data->'parts') as elements
        WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
        GROUP BY type, quizzes.id
        ORDER BY quizzes.id, COUNT(*) DESC
      ) as base
      GROUP BY type
      ORDER BY COUNT(*) DESC
    `),
    partTypesGraph: query(`
      SELECT elements->>'type' as type, DATE_TRUNC('month', created_at) as date, COUNT(*) as count
      FROM quizzes, jsonb_array_elements(data->'parts') as elements
      WHERE created_at > CURRENT_DATE - INTERVAL '12 month'
      GROUP BY elements->>'type', DATE_TRUNC('month', created_at)
      ORDER BY date, COUNT(*) DESC
    `),
    quizCount: query('SELECT COUNT(*) as count FROM quizzes').then(r => Number(r[0].count)),
  };

  const partTypes = await p.partTypes;
  const partTypesLastMonth = await p.partTypesLastMonth;
  const quizPartTypes = await p.quizPartTypes;
  const quizPartTypesLastMonth = await p.quizPartTypesLastMonth;
  const partTypesGraph = await p.partTypesGraph;
  const quizCount = await p.quizCount;

  const totalParts = partTypes.reduce((sum: number, pt: Record<string, unknown>) => sum + Number(pt.count), 0);
  const totalPartsLastMonth = partTypesLastMonth.reduce((sum: number, pt: Record<string, unknown>) => sum + Number(pt.count), 0);

  const lastMonthMap = new Map(partTypesLastMonth.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));
  const quizTypeMap = new Map(quizPartTypes.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));
  const quizTypeLastMonthMap = new Map(quizPartTypesLastMonth.map((pt: Record<string, unknown>) => [pt.type, Number(pt.count)]));

  const chartData = partTypesGraph.map((r: Record<string, unknown>) => ({
    type: r.type as string,
    date: new Date(r.date as string).getTime(),
    count: Number(r.count),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold">Part Types</h1>
        <span className="text-sm text-muted-foreground">
          Total parts: {numberWithDelimiter(totalParts)} | Last month: {numberWithDelimiter(totalPartsLastMonth)} | Quizzes: {numberWithDelimiter(Number(quizCount))}
        </span>
      </div>

      <Card>
        <CardContent>
          <PartTypesChart data={chartData} types={partTypes.slice(0, 10).map((pt: Record<string, unknown>) => pt.type as string)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Parts (all)</TableHead>
                <TableHead className="text-right">Parts (30d)</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Quizzes (all)</TableHead>
                <TableHead className="text-right">Quizzes (30d)</TableHead>
                <TableHead>Bar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partTypes.map((pt: Record<string, unknown>) => {
                const count = Number(pt.count);
                const pct = totalParts > 0 ? ((count / totalParts) * 100).toFixed(1) : '0';
                const barWidth = totalParts > 0 ? (count / totalParts) * 100 : 0;
                return (
                  <TableRow key={pt.type as string}>
                    <TableCell className="font-mono text-xs font-bold">
                      <Link href={`/part-types/${pt.type}`} className="text-primary hover:underline">
                        {pt.type as string}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{numberWithDelimiter(count)}</TableCell>
                    <TableCell className="text-right">{numberWithDelimiter(lastMonthMap.get(pt.type as string) || 0)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                    <TableCell className="text-right">{numberWithDelimiter(quizTypeMap.get(pt.type as string) || 0)}</TableCell>
                    <TableCell className="text-right">{numberWithDelimiter(quizTypeLastMonthMap.get(pt.type as string) || 0)}</TableCell>
                    <TableCell>
                      <div className="w-48 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${barWidth}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
