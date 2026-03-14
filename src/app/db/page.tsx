import { query } from '@/lib/db';
import { numberWithDelimiter, timeAgo } from '@/lib/format';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const tables = [
  { name: 'Images', table: 'images' },
  { name: 'Plans', table: 'plans' },
  { name: 'Quizzes', table: 'quizzes' },
  { name: 'Quiz events', table: 'quiz_events' },
  { name: 'Quiz logs', table: 'quiz_logs' },
  { name: 'Quiz results', table: 'quiz_results' },
  { name: 'Sounds', table: 'sounds' },
  { name: 'Subscriptions', table: 'subscriptions' },
  { name: 'Users', table: 'users' },
];

export default async function DbPage() {
  const results = await Promise.all(
    tables.map(async (t) => {
      const [{ count }] = await query(`SELECT COUNT(*) as count FROM ${t.table}`);
      const [{ last }] = await query(`SELECT MAX(created_at) as last FROM ${t.table}`);
      return { name: t.name, count: Number(count), last };
    })
  );

  const maxLog = Math.max(...results.map((r) => Math.log10(r.count || 1)));

  const colors = [
    'bg-yellow-400',
    'bg-blue-400',
    'bg-yellow-400',
    'bg-red-400',
    'bg-red-400',
    'bg-red-400',
    'bg-green-500',
    'bg-yellow-400',
    'bg-yellow-400',
  ];

  return (
    <div>
      <div className="mb-4">
        <a href="https://db.quizshow.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">db.quizshow.io</a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Model name</TableHead>
            <TableHead className="w-[160px]">Last created</TableHead>
            <TableHead>Records</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, i) => {
            const pct = maxLog > 0 ? (Math.log10(r.count || 1) / maxLog) * 100 : 0;
            return (
              <TableRow key={r.name}>
                <TableCell className="font-medium text-primary">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{timeAgo(r.last)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-6 rounded ${colors[i % colors.length]} bg-opacity-80 flex items-center justify-center text-xs font-medium text-white min-w-[40px]`}
                      style={{
                        width: `${Math.max(pct, 5)}%`,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.15) 5px, rgba(255,255,255,0.15) 10px)',
                      }}
                    >
                      {numberWithDelimiter(r.count)}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
