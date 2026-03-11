import { ReactNode } from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow } from '@/components/ui/table';

interface DataTableProps {
  headers: string[];
  children: ReactNode;
  title?: string;
}

export default function DataTable({ headers, children, title }: DataTableProps) {
  return (
    <div>
      {title && <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>}
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={i} className="text-xs">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
