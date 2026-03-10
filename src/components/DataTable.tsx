import { ReactNode } from 'react';

interface DataTableProps {
  headers: string[];
  children: ReactNode;
  title?: string;
}

export default function DataTable({ headers, children, title }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      {title && <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>}
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-700">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">{children}</tbody>
      </table>
    </div>
  );
}
