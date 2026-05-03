'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DataPoint {
  type: string;
  date: number;
  count: number;
}

const COLORS = [
  '#66af1f', '#2893da', '#e16070', '#f2b654',
  '#772eb9', '#41b7cc', '#e8873d', '#efc663',
];

interface Props {
  data: DataPoint[];
  types: string[];
  title: string;
  labels?: Record<string, string>;
}

export default function StylesChart({ data, types, title, labels = {} }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (instanceRef.current) instanceRef.current.dispose();

    const allDates = [...new Set(data.map(d => d.date))].sort();
    const seriesByType: Record<string, Record<number, number>> = {};
    data.forEach(d => {
      seriesByType[d.type] = seriesByType[d.type] || {};
      seriesByType[d.type][d.date] = d.count;
    });

    const totals: Record<number, number> = {};
    allDates.forEach(date => {
      totals[date] = 0;
      Object.values(seriesByType).forEach(dataObj => {
        totals[date] += dataObj[date] || 0;
      });
    });

    const seriesData = types.map((type, index) => ({
      name: labels[type] || type,
      type: 'bar' as const,
      stack: 'total',
      data: allDates.map(date => {
        const abs = seriesByType[type]?.[date] || 0;
        const total = totals[date];
        const pct = total === 0 ? 0 : (abs / total) * 100;
        return [date, pct];
      }),
      itemStyle: { color: COLORS[index % COLORS.length] },
    }));

    instanceRef.current = echarts.init(chartRef.current);
    instanceRef.current.setOption({
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: { fontSize: 14, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = params as { value: number[]; marker: string; seriesName: string }[];
          let result = new Date(items[0].value[0]).toLocaleDateString() + '<br/>';
          items.forEach(item => {
            result += item.marker + ' ' + item.seriesName + ': ' + item.value[1].toFixed(1) + '%<br/>';
          });
          return result;
        },
      },
      legend: { top: 40, type: 'scroll' },
      grid: { left: '3%', right: '4%', top: 80, bottom: '3%', containLabel: true },
      xAxis: { type: 'time' },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
        max: 100,
      },
      series: seriesData,
    });

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      instanceRef.current?.dispose();
    };
  }, [data, types, title, labels]);

  return <div ref={chartRef} style={{ height: 350 }} />;
}
