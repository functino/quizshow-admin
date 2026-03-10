'use client';
import { useEffect, useRef } from 'react';

interface DataPoint {
  type: string;
  date: number;
  count: number;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
];

export default function PartTypesChart({ data, types }: { data: DataPoint[]; types: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 250 * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 250;
    const padding = { top: 30, right: 120, bottom: 25, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Part Types (12 months)', w / 2, 18);

    // Group by month
    const months = [...new Set(data.map((d) => d.date))].sort();
    if (months.length === 0) return;

    // Compute stacked totals per month
    const monthTotals = months.map((m) => {
      const items = data.filter((d) => d.date === m);
      return items.reduce((s, i) => s + i.count, 0);
    });
    const maxTotal = Math.max(...monthTotals, 1);
    const barWidth = Math.max(2, chartW / months.length - 2);

    // Draw stacked bars
    months.forEach((month, mi) => {
      const x = padding.left + (mi / months.length) * chartW;
      let yOffset = 0;

      types.forEach((type, ti) => {
        const item = data.find((d) => d.date === month && d.type === type);
        const count = item?.count || 0;
        const barH = (count / maxTotal) * chartH;

        ctx.fillStyle = COLORS[ti % COLORS.length];
        ctx.fillRect(x, padding.top + chartH - yOffset - barH, barWidth, barH);
        yOffset += barH;
      });

      // X label every 2 months
      if (mi % 2 === 0) {
        const date = new Date(month);
        ctx.fillStyle = '#6b7280';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          x + barWidth / 2,
          h - 5,
        );
      }
    });

    // Legend
    const legendX = w - padding.right + 10;
    types.forEach((type, i) => {
      const y = padding.top + i * 18;
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fillRect(legendX, y, 10, 10);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(type, legendX + 14, y + 9);
    });
  }, [data, types]);

  return <canvas ref={canvasRef} className="w-full" height={250} />;
}
