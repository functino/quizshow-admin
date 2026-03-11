import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
