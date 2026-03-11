'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

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
  const userChartRef = useRef<HTMLDivElement>(null);
  const quizChartRef = useRef<HTMLDivElement>(null);
  const userInstanceRef = useRef<echarts.ECharts | null>(null);
  const quizInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!userChartRef.current || !quizChartRef.current) return;

    // Dispose existing instances
    if (userInstanceRef.current) userInstanceRef.current.dispose();
    if (quizInstanceRef.current) quizInstanceRef.current.dispose();

    // Current month projection
    const now = new Date();
    const currentMonthTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthFraction = dayOfMonth / daysInMonth;

    // Build confirmed lookup
    const confirmedMap = new Map<number, number>();
    data.confirmedByMonth.forEach(d => confirmedMap.set(d.month, d.count));

    // User chart data
    const confirmedSeries: [number, number][] = [];
    const unconfirmedSeries: [number, number][] = [];
    const userEstimatedSeries: [number, number][] = [];

    data.userByMonth.forEach(d => {
      const confirmed = confirmedMap.get(d.month) || 0;
      const unconfirmed = d.count - confirmed;
      const isCurrentMonth = d.month === currentMonthTs;

      confirmedSeries.push([d.month, confirmed]);
      unconfirmedSeries.push([d.month, unconfirmed]);

      if (isCurrentMonth && monthFraction > 0) {
        const projectedConfirmed = Math.round(confirmed / monthFraction) - confirmed;
        userEstimatedSeries.push([d.month, Math.max(0, projectedConfirmed)]);
      } else {
        userEstimatedSeries.push([d.month, 0]);
      }
    });

    userInstanceRef.current = echarts.init(userChartRef.current);
    userInstanceRef.current.setOption({
      title: {
        text: 'Registrations by month',
        left: 'center',
        top: 10,
        textStyle: { fontSize: 14, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['confirmed', 'unconfirmed', 'estimated'],
        right: 10,
        top: 5,
      },
      grid: { left: '3%', right: '4%', top: 40, bottom: '3%', containLabel: true },
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          interval: (_index: number, value: string) => new Date(value).getMonth() === 0,
          lineStyle: { color: 'rgba(0,0,0,0.08)', width: 2 },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      },
      series: [
        {
          name: 'confirmed',
          type: 'bar',
          stack: 'total',
          data: confirmedSeries,
          itemStyle: { color: '#2893da' },
        },
        {
          name: 'unconfirmed',
          type: 'bar',
          stack: 'total',
          data: unconfirmedSeries,
          itemStyle: { color: '#e16070' },
        },
        {
          name: 'estimated',
          type: 'bar',
          stack: 'total',
          data: userEstimatedSeries,
          itemStyle: { color: '#f2b654' },
        },
      ],
    });

    // Quiz chart data
    const quizSeries: [number, number][] = [];
    const quizEstimatedSeries: [number, number][] = [];

    data.quizByMonth.forEach(d => {
      const isCurrentMonth = d.month === currentMonthTs;
      quizSeries.push([d.month, d.count]);

      if (isCurrentMonth && monthFraction > 0) {
        const projected = Math.round(d.count / monthFraction) - d.count;
        quizEstimatedSeries.push([d.month, Math.max(0, projected)]);
      } else {
        quizEstimatedSeries.push([d.month, 0]);
      }
    });

    quizInstanceRef.current = echarts.init(quizChartRef.current);
    quizInstanceRef.current.setOption({
      title: {
        text: 'Quizzes by month',
        left: 'center',
        top: 10,
        textStyle: { fontSize: 14, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Quizzes', 'estimated'],
        right: 10,
        top: 5,
      },
      grid: { left: '3%', right: '4%', top: 40, bottom: '3%', containLabel: true },
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          interval: (_index: number, value: string) => new Date(value).getMonth() === 0,
          lineStyle: { color: 'rgba(0,0,0,0.08)', width: 2 },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      },
      series: [
        {
          name: 'Quizzes',
          type: 'bar',
          stack: 'total',
          data: quizSeries,
          itemStyle: { color: '#66af1f' },
        },
        {
          name: 'estimated',
          type: 'bar',
          stack: 'total',
          data: quizEstimatedSeries,
          itemStyle: { color: '#efc663' },
        },
      ],
    });

    const handleResize = () => {
      userInstanceRef.current?.resize();
      quizInstanceRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      userInstanceRef.current?.dispose();
      quizInstanceRef.current?.dispose();
    };
  }, [data]);

  return (
    <section className="space-y-6">
      <div ref={userChartRef} style={{ height: 250 }} />
      <div ref={quizChartRef} style={{ height: 250 }} />
    </section>
  );
}
