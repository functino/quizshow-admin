import { query } from '@/lib/db';
import { numberWithDelimiter } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import StylesChart from './StylesChart';

export const dynamic = 'force-dynamic';

const INTRO_LABELS: Record<string, string> = {
  default: 'Basic',
  plain: 'Big Number',
};

const SCORE_LABELS: Record<string, string> = {
  plain: 'Plain',
  fireworks: 'Fireworks',
};

const FIREWORKS_VARIANT_LABELS: Record<string, string> = {
  podium: 'Podium',
  board: 'Board',
  spot: 'Spotlight',
};

interface CountRow {
  key: string;
  count: number;
}

interface SeriesRow {
  key: string;
  date: number;
  count: number;
}

function buildTotals(rows: CountRow[]): { total: number; byKey: Map<string, number> } {
  const byKey = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    byKey.set(r.key, Number(r.count));
    total += Number(r.count);
  }
  return { total, byKey };
}

export default async function StylesPage() {
  const introAll = query(`
    SELECT COALESCE(NULLIF(data->'intro'->>'type', ''), 'default') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    GROUP BY key
    ORDER BY count DESC
  `);
  const introLastMonth = query(`
    SELECT COALESCE(NULLIF(data->'intro'->>'type', ''), 'default') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
    GROUP BY key
    ORDER BY count DESC
  `);
  const introSeries = query(`
    SELECT COALESCE(NULLIF(data->'intro'->>'type', ''), 'default') AS key,
           DATE_TRUNC('month', created_at) AS date,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE created_at > CURRENT_DATE - INTERVAL '12 month'
    GROUP BY key, DATE_TRUNC('month', created_at)
    ORDER BY date
  `);

  const scoreAll = query(`
    SELECT COALESCE(NULLIF(data->'score'->>'type', ''), 'plain') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    GROUP BY key
    ORDER BY count DESC
  `);
  const scoreLastMonth = query(`
    SELECT COALESCE(NULLIF(data->'score'->>'type', ''), 'plain') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 month'
    GROUP BY key
    ORDER BY count DESC
  `);
  const scoreSeries = query(`
    SELECT COALESCE(NULLIF(data->'score'->>'type', ''), 'plain') AS key,
           DATE_TRUNC('month', created_at) AS date,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE created_at > CURRENT_DATE - INTERVAL '12 month'
    GROUP BY key, DATE_TRUNC('month', created_at)
    ORDER BY date
  `);

  // Fireworks subType variants — default 'podium' when missing.
  const fireworksVariantsAll = query(`
    SELECT COALESCE(NULLIF(data->'score'->>'subType', ''), 'podium') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE data->'score'->>'type' = 'fireworks'
    GROUP BY key
    ORDER BY count DESC
  `);
  const fireworksVariantsLastMonth = query(`
    SELECT COALESCE(NULLIF(data->'score'->>'subType', ''), 'podium') AS key,
           COUNT(*)::int AS count
    FROM quizzes
    WHERE data->'score'->>'type' = 'fireworks'
      AND updated_at > CURRENT_DATE - INTERVAL '1 month'
    GROUP BY key
    ORDER BY count DESC
  `);

  const [
    introAllRaw,
    introLastMonthRaw,
    introSeriesRaw,
    scoreAllRaw,
    scoreLastMonthRaw,
    scoreSeriesRaw,
    fwAllRaw,
    fwLastMonthRaw,
  ] = await Promise.all([
    introAll, introLastMonth, introSeries,
    scoreAll, scoreLastMonth, scoreSeries,
    fireworksVariantsAll, fireworksVariantsLastMonth,
  ]);

  const introAllRows = introAllRaw as unknown as CountRow[];
  const introLastMonthRows = introLastMonthRaw as unknown as CountRow[];
  const introSeriesRows = introSeriesRaw as unknown as SeriesRow[];
  const scoreAllRows = scoreAllRaw as unknown as CountRow[];
  const scoreLastMonthRows = scoreLastMonthRaw as unknown as CountRow[];
  const scoreSeriesRows = scoreSeriesRaw as unknown as SeriesRow[];
  const fwAllRows = fwAllRaw as unknown as CountRow[];
  const fwLastMonthRows = fwLastMonthRaw as unknown as CountRow[];

  const intro = buildTotals(introAllRows);
  const introMonth = buildTotals(introLastMonthRows);
  const score = buildTotals(scoreAllRows);
  const scoreMonth = buildTotals(scoreLastMonthRows);
  const fw = buildTotals(fwAllRows);
  const fwMonth = buildTotals(fwLastMonthRows);

  const introSeriesData = introSeriesRows.map(r => ({
    type: r.key,
    date: new Date(r.date as unknown as string).getTime(),
    count: Number(r.count),
  }));
  const scoreSeriesData = scoreSeriesRows.map(r => ({
    type: r.key,
    date: new Date(r.date as unknown as string).getTime(),
    count: Number(r.count),
  }));

  const renderTable = (
    rows: CountRow[],
    totals: { total: number; byKey: Map<string, number> },
    monthTotals: { total: number; byKey: Map<string, number> },
    labels: Record<string, string>,
  ) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Quizzes (all)</TableHead>
          <TableHead className="text-right">Quizzes (30d)</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead>Bar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(r => {
          const count = Number(r.count);
          const pct = totals.total > 0 ? (count / totals.total) * 100 : 0;
          const barWidth = pct;
          return (
            <TableRow key={r.key}>
              <TableCell className="font-medium">
                {labels[r.key] || r.key}
                <span className="font-mono text-xs text-muted-foreground ml-2">{r.key}</span>
              </TableCell>
              <TableCell className="text-right">{numberWithDelimiter(count)}</TableCell>
              <TableCell className="text-right">{numberWithDelimiter(monthTotals.byKey.get(r.key) || 0)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{pct.toFixed(1)}%</TableCell>
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold">Quiz Styles</h1>
        <span className="text-sm text-muted-foreground">
          Total quizzes: {numberWithDelimiter(intro.total)} | Last month: {numberWithDelimiter(introMonth.total)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intro type</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTable(introAllRows, intro, introMonth, INTRO_LABELS)}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <StylesChart data={introSeriesData} types={Array.from(intro.byKey.keys())} title="Intro type usage over time (%)" labels={INTRO_LABELS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Score type</CardTitle>
        </CardHeader>
        <CardContent>
          {renderTable(scoreAllRows, score, scoreMonth, SCORE_LABELS)}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <StylesChart data={scoreSeriesData} types={Array.from(score.byKey.keys())} title="Score type usage over time (%)" labels={SCORE_LABELS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fireworks variants</CardTitle>
        </CardHeader>
        <CardContent>
          {fwAllRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quizzes use the Fireworks score type.</div>
          ) : (
            renderTable(fwAllRows, fw, fwMonth, FIREWORKS_VARIANT_LABELS)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
