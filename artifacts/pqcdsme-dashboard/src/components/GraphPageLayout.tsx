import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, Edit2, Check } from "lucide-react";
import { api } from "../lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler
);

const PLANT_ID = 1;

interface GraphPageLayoutProps {
  title: string;
  color: string;
  fieldKey: string;
  targetFieldKey?: string;
}

function InsightBox({ section, chartType, defaultText }: { section: string; chartType: string; defaultText: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(defaultText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createInsight({
        plantId: PLANT_ID,
        section,
        chartType,
        insightText: text,
        insightDate: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Failed to save insight:', err);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-md group relative">
        <p className="text-sm text-gray-700 pr-8">{text}</p>
        <button onClick={() => setEditing(true)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-sm bg-gray-900 text-white rounded-md flex items-center gap-1">
          {saving ? 'Saving...' : <><Check className="w-3 h-3" /> Save</>}
        </button>
      </div>
    </div>
  );
}

export function GraphPageLayout({ title, color, fieldKey }: GraphPageLayoutProps) {
  const section = title.toLowerCase();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [todayData, setTodayData] = useState<{ hour: string; value: number }[]>([]);
  const [cumulativeData, setCumulativeData] = useState<{ date: string; value: number }[]>([]);
  const [momData, setMomData] = useState<{ month: string; monthNum: string; value: number }[]>([]);
  const [yoyData, setYoyData] = useState<{ year: number; month: string; monthNum: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [today, cumulative, mom, yoy] = await Promise.all([
          api.getStatsToday(PLANT_ID, section, fieldKey),
          api.getStatsCumulative(PLANT_ID, section, fieldKey, month, year),
          api.getStatsMoM(PLANT_ID, section, fieldKey),
          api.getStatsYoY(PLANT_ID, section, fieldKey),
        ]);
        setTodayData(today);
        setCumulativeData(cumulative);
        setMomData(mom);
        setYoyData(yoy);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [section, fieldKey]);

  // KPI calculations
  const todayTotal = todayData.reduce((s, r) => s + Number(r.value), 0);
  const cumulativeTotal = cumulativeData.length ? cumulativeData[cumulativeData.length - 1].value : 0;

  const thisMonthMoM = momData.find(r => r.monthNum === `${year}-${String(month).padStart(2, '0')}`);
  const lastMonthMoM = momData.find(r => {
    const d = new Date(year, month - 2, 1);
    return r.monthNum === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const momPct = thisMonthMoM && lastMonthMoM && Number(lastMonthMoM.value) > 0
    ? (((Number(thisMonthMoM.value) - Number(lastMonthMoM.value)) / Number(lastMonthMoM.value)) * 100).toFixed(1)
    : 'N/A';

  const thisYearYoY = yoyData.filter(r => r.year === year);
  const lastYearYoY = yoyData.filter(r => r.year === year - 1);
  const thisYearTotal = thisYearYoY.reduce((s, r) => s + Number(r.value), 0);
  const lastYearTotal = lastYearYoY.reduce((s, r) => s + Number(r.value), 0);
  const yoyPct = lastYearTotal > 0
    ? (((thisYearTotal - lastYearTotal) / lastYearTotal) * 100).toFixed(1)
    : 'N/A';

  // Chart data
  const todayChartData = {
    labels: todayData.map(r => `${r.hour}:00`),
    datasets: [{
      label: 'Actual',
      data: todayData.map(r => Number(r.value)),
      backgroundColor: color,
      borderRadius: 4,
    }]
  };

  const cumulativeChartData = {
    labels: cumulativeData.map(r => r.date.slice(5)),
    datasets: [{
      label: 'Cumulative',
      data: cumulativeData.map(r => r.value),
      borderColor: color,
      backgroundColor: `${color}22`,
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }]
  };

  const momChartData = {
    labels: momData.map(r => r.month),
    datasets: [{
      label: 'Monthly Total',
      data: momData.map(r => Number(r.value)),
      backgroundColor: momData.map((r, i) => i === momData.length - 1 ? color : `${color}66`),
      borderRadius: 4,
    }]
  };

  const allMonths = [...new Set(yoyData.map(r => r.month))];
  const yoyChartData = {
    labels: allMonths,
    datasets: [
      {
        label: String(year - 1),
        data: allMonths.map(m => {
          const found = yoyData.find(r => r.month === m && r.year === year - 1);
          return found ? Number(found.value) : 0;
        }),
        backgroundColor: `${color}55`,
        borderRadius: 4,
      },
      {
        label: String(year),
        data: allMonths.map(m => {
          const found = yoyData.find(r => r.month === m && r.year === year);
          return found ? Number(found.value) : 0;
        }),
        backgroundColor: color,
        borderRadius: 4,
      }
    ]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading charts...</div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-xl font-bold text-gray-900">{title} Overview</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today", value: todayTotal.toLocaleString() },
          { label: "Month Cum.", value: cumulativeTotal.toLocaleString() },
          { label: "vs Last Month", value: momPct !== 'N/A' ? `${Number(momPct) >= 0 ? '+' : ''}${momPct}%` : 'N/A' },
          { label: "vs Last Year", value: yoyPct !== 'N/A' ? `${Number(yoyPct) >= 0 ? '+' : ''}${yoyPct}%` : 'N/A' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Today's Performance</h3>
          {todayData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No data entered today yet</p>
            : <div className="h-[250px]"><Bar data={todayChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="today" defaultText="Performance is steady across shifts today." />
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Month Cumulative</h3>
          {cumulativeData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No data for this month yet</p>
            : <div className="h-[250px]"><Line data={cumulativeChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="cumulative" defaultText="Tracking cumulative progress for the month." />
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Month on Month Trend</h3>
          {momData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No monthly data available</p>
            : <div className="h-[250px]"><Bar data={momChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="mom" defaultText="Monthly trend comparison." />
        </div>

        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Year on Year Comparison</h3>
          {yoyData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No year-on-year data available</p>
            : <div className="h-[250px]"><Bar data={yoyChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="yoy" defaultText="Year on year comparison." />
        </div>
      </div>
    </div>
  );
}