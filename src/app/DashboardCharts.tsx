'use client';
import { useEffect, useRef } from 'react';

interface ChartDataPoint {
  month: number;
  count: number;
}

interface Props {
  data: {
    quizByMonth: ChartDataPoint[];
    userByMonth: ChartDataPoint[];
    confirmedByMonth: ChartDataPoint[];
  };
}

export default function DashboardCharts({ data }: Props) {
  const userChartRef = useRef<HTMLCanvasElement>(null);
  const quizChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawChart(userChartRef.current, data.userByMonth, data.confirmedByMonth, 'Registrations by month');
    drawChart(quizChartRef.current, data.quizByMonth, null, 'Quizzes by month');
  }, [data]);

  return (
    <section className="space-y-6">
      <div>
        <canvas ref={userChartRef} className="w-full" height={200} />
      </div>
      <div>
        <canvas ref={quizChartRef} className="w-full" height={200} />
      </div>
    </section>
  );
}

function drawChart(
  canvas: HTMLCanvasElement | null,
  primaryData: ChartDataPoint[],
  secondaryData: ChartDataPoint[] | null,
  title: string,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 200;
  const padding = { top: 30, right: 20, bottom: 25, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 18);

  if (primaryData.length === 0) return;

  const maxVal = Math.max(...primaryData.map((d) => d.count), 1);
  const barWidth = Math.max(2, chartW / primaryData.length - 2);

  // Build confirmed map for stacking
  const confirmedMap = new Map<number, number>();
  if (secondaryData) {
    secondaryData.forEach((d) => confirmedMap.set(d.month, d.count));
  }

  // Y axis labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxVal / 4) * i);
    const y = padding.top + chartH - (i / 4) * chartH;
    ctx.fillText(String(val), padding.left - 5, y + 3);
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.2)';
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // Determine if last bar is current month (for projection)
  const now = new Date();
  const currentMonthTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthFraction = dayOfMonth / daysInMonth;

  primaryData.forEach((d, i) => {
    const x = padding.left + (i / primaryData.length) * chartW;
    const isCurrentMonth = d.month === currentMonthTs;
    const confirmedCount = confirmedMap.get(d.month) || 0;
    const unconfirmedCount = d.count - confirmedCount;

    if (isCurrentMonth && monthFraction > 0) {
      // Draw projected (estimated full month) as faded bar
      const projectedCount = Math.round(d.count / monthFraction);
      const projH = (projectedCount / maxVal) * chartH;
      if (secondaryData) {
        const projConfirmed = Math.round(confirmedCount / monthFraction);
        const projUnconfirmed = projectedCount - projConfirmed;
        const projConfH = (projConfirmed / maxVal) * chartH;
        const projUnconfH = (projUnconfirmed / maxVal) * chartH;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fillRect(x, padding.top + chartH - projConfH, barWidth, projConfH);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(x, padding.top + chartH - projConfH - projUnconfH, barWidth, projUnconfH);
      } else {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.fillRect(x, padding.top + chartH - projH, barWidth, projH);
      }
    }

    // Draw actual bar on top
    const barH = (d.count / maxVal) * chartH;
    if (secondaryData) {
      const confH = (confirmedCount / maxVal) * chartH;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, padding.top + chartH - confH, barWidth, confH);
      const unconfH = (unconfirmedCount / maxVal) * chartH;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, padding.top + chartH - confH - unconfH, barWidth, unconfH);
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x, padding.top + chartH - barH, barWidth, barH);
    }

    // X axis label (every 6 months)
    if (i % 6 === 0) {
      const date = new Date(d.month);
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
}
