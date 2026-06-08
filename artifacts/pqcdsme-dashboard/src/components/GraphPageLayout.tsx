import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ChevronLeft, Edit2, Check, X } from "lucide-react";
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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
        insightDate: new Date().toLocaleDateString('en-CA'),
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
        <button
          onClick={() => setEditing(true)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-sm bg-gray-900 text-white rounded-md flex items-center gap-1"
        >
          {saving ? 'Saving...' : <><Check className="w-3 h-3" /> Save</>}
        </button>
      </div>
    </div>
  );
}

// Breadcrumb chip pill
function DrillChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {label}
      <button onClick={onClear} className="ml-0.5 hover:text-blue-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export function GraphPageLayout({ title, color, fieldKey, targetFieldKey }: GraphPageLayoutProps) {
  const section = title.toLowerCase();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Drill-down state
  // selectedYear: null = default (all years in YoY, last 6 months in MoM)
  //               number = a specific year was clicked in YoY
  // selectedMonth: null = use currentMonth for cumulative
  //                number = a specific month was clicked in MoM
  const [selectedYear, setSelectedYear]   = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Chart data
  const [todayData, setTodayData]           = useState<{ hour: string; value: number }[]>([]);
  const [cumulativeData, setCumulativeData] = useState<{ date: string; value: number }[]>([]);
  const [momData, setMomData]               = useState<{ month: string; monthNum: string; value: number }[]>([]);
  const [yoyData, setYoyData]               = useState<{ year: number; month: string; monthNum: number; value: number }[]>([]);
  const [targetValue, setTargetValue]       = useState<number | null>(null);

  const [loadingInit, setLoadingInit]       = useState(true);
  const [loadingMom, setLoadingMom]         = useState(false);
  const [loadingCumulative, setLoadingCumulative] = useState(false);

  // Derived: which month/year to show in cumulative
  const cumulativeMonth = selectedMonth ?? currentMonth;
  const cumulativeYear  = selectedYear  ?? currentYear;

  // Initial load: today, MoM (default), YoY, targets
  useEffect(() => {
    const fetchInit = async () => {
      setLoadingInit(true);
      try {
        const [today, mom, yoy, targets] = await Promise.all([
          api.getStatsToday(PLANT_ID, section, fieldKey),
          api.getStatsMoM(PLANT_ID, section, fieldKey),
          api.getStatsYoY(PLANT_ID, section, fieldKey),
          targetFieldKey
            ? api.getTargets({ plantId: PLANT_ID, section, month: currentMonth, year: currentYear })
            : Promise.resolve([]),
        ]);
        setTodayData(today);
        setMomData(mom);
        setYoyData(yoy);
        if (targetFieldKey && targets.length > 0) {
          const match = targets.find((t: any) => t.fieldKey === targetFieldKey);
          setTargetValue(match ? Number(match.targetValue) : null);
        }
      } catch (err) {
        console.error('Failed to fetch initial stats:', err);
      } finally {
        setLoadingInit(false);
      }
    };
    fetchInit();
  }, [section, fieldKey, targetFieldKey]);

  // Fetch MoM whenever selectedYear changes (null = default last 6 months)
  useEffect(() => {
    if (loadingInit) return; // wait for initial load
    const fetchMom = async () => {
      setLoadingMom(true);
      try {
        const mom = await api.getStatsMoM(PLANT_ID, section, fieldKey, selectedYear ?? undefined);
        setMomData(mom);
      } catch (err) {
        console.error('Failed to fetch MoM:', err);
      } finally {
        setLoadingMom(false);
      }
    };
    fetchMom();
  }, [selectedYear]);

  // Fetch cumulative whenever cumulativeMonth or cumulativeYear changes
  useEffect(() => {
    const fetchCumulative = async () => {
      setLoadingCumulative(true);
      try {
        const [cumulative, targets] = await Promise.all([
          api.getStatsCumulative(PLANT_ID, section, fieldKey, cumulativeMonth, cumulativeYear),
          targetFieldKey
            ? api.getTargets({ plantId: PLANT_ID, section, month: cumulativeMonth, year: cumulativeYear })
            : Promise.resolve([]),
        ]);
        setCumulativeData(cumulative);
        if (targetFieldKey && targets.length > 0) {
          const match = targets.find((t: any) => t.fieldKey === targetFieldKey);
          setTargetValue(match ? Number(match.targetValue) : null);
        } else {
          setTargetValue(null);
        }
      } catch (err) {
        console.error('Failed to fetch cumulative:', err);
      } finally {
        setLoadingCumulative(false);
      }
    };
    fetchCumulative();
  }, [cumulativeMonth, cumulativeYear, section, fieldKey, targetFieldKey]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleYoyClick = useCallback((_event: any, elements: any[]) => {
    if (!elements.length) return;
    const idx = elements[0].index;
    const clickedYear = years[idx];
    setSelectedYear(clickedYear);
    setSelectedMonth(1); // default to January when drilling from YoY
  }, []);

  const handleMomClick = useCallback((_event: any, elements: any[]) => {
    if (!elements.length) return;
    const idx = elements[0].index;
    const monthNumStr = momData[idx]?.monthNum; // "YYYY-MM"
    if (!monthNumStr) return;
    const monthNum = parseInt(monthNumStr.split('-')[1], 10);
    setSelectedMonth(monthNum);
  }, [momData]);

  const clearYear = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  const clearMonth = () => {
    setSelectedMonth(null);
  };

  // ── KPI calculations ───────────────────────────────────────────────────────

  const todayTotal      = todayData.reduce((s, r) => s + Number(r.value), 0);
  const cumulativeTotal = cumulativeData.length ? cumulativeData[cumulativeData.length - 1].value : 0;

  const thisMonthMoM = momData.find(r => r.monthNum === `${currentYear}-${String(currentMonth).padStart(2, '0')}`);
  const lastMonthMoM = momData.find(r => {
    const d = new Date(currentYear, currentMonth - 2, 1);
    return r.monthNum === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const momPct = thisMonthMoM && lastMonthMoM && Number(lastMonthMoM.value) > 0
    ? (((Number(thisMonthMoM.value) - Number(lastMonthMoM.value)) / Number(lastMonthMoM.value)) * 100).toFixed(1)
    : 'N/A';

  const thisYearYoY   = yoyData.filter(r => Number(r.year) === currentYear);
  const lastYearYoY   = yoyData.filter(r => Number(r.year) === currentYear - 1);
  const thisYearTotal = thisYearYoY.reduce((s, r) => s + Number(r.value), 0);
  const lastYearTotal = lastYearYoY.reduce((s, r) => s + Number(r.value), 0);
  const yoyPct = lastYearTotal > 0
    ? (((thisYearTotal - lastYearTotal) / lastYearTotal) * 100).toFixed(1)
    : 'N/A';

  // ── Chart data ─────────────────────────────────────────────────────────────

  const todayChartData = {
    labels: todayData.map(r => r.hour),
    datasets: [{
      label: 'Actual',
      data: todayData.map(r => Number(r.value)),
      backgroundColor: color,
      borderRadius: 4,
    }]
  };

  const cumulativeChartData = {
    labels: cumulativeData.map(r => r.date.slice(5)),
    datasets: [
      {
        label: 'Cumulative',
        data: cumulativeData.map(r => r.value),
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      ...(targetValue !== null ? [{
        label: 'Target',
        data: cumulativeData.map(() => targetValue),
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [6, 3],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0,
      }] : []),
    ]
  };

  // MoM: highlight the selected month bar
  const momChartData = {
    labels: momData.map(r => r.month),
    datasets: [{
      label: 'Monthly Total',
      data: momData.map(r => Number(r.value)),
      backgroundColor: momData.map((r) => {
        const mNum = parseInt(r.monthNum.split('-')[1], 10);
        if (selectedMonth !== null && mNum === selectedMonth) return color;          // selected = full color
        if (selectedMonth === null && r.monthNum === `${currentYear}-${String(currentMonth).padStart(2, '0')}`) return color; // current month default
        return `${color}66`;
      }),
      borderRadius: 4,
      cursor: 'pointer',
    }]
  };

  // YoY: one bar per year, highlight selected year
  const years = [...new Set(yoyData.map(r => Number(r.year)))].sort();
  const yoyChartData = {
    labels: years.map(String),
    datasets: [{
      label: 'Annual Total',
      data: years.map(y =>
        yoyData
          .filter(r => Number(r.year) === y)
          .reduce((sum, r) => sum + Number(r.value), 0)
      ),
      backgroundColor: years.map((y) => {
        if (selectedYear !== null && y === selectedYear) return color;
        if (selectedYear === null && y === currentYear) return color;
        return `${color}55`;
      }),
      borderRadius: 4,
    }]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } }
  };

  const clickableBarOptions = (onClick: (e: any, els: any[]) => void) => ({
    ...commonOptions,
    onClick,
    onHover: (_event: any, elements: any[], chart: any) => {
      chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
    },
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        callbacks: {
          footer: () => 'Click to drill down ↓'
        }
      }
    }
  });

  // Human-readable label for cumulative header
  const cumulativeLabel = `${MONTH_NAMES[cumulativeMonth - 1]} ${cumulativeYear}`;

  if (loadingInit) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Loading charts...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-xl font-bold text-gray-900">{title} Overview</h2>
        </div>
        {/* Drill-down breadcrumb chips */}
        {selectedYear !== null && (
          <DrillChip label={`Year: ${selectedYear}`} onClear={clearYear} />
        )}
        {selectedMonth !== null && (
          <DrillChip label={`Month: ${MONTH_NAMES[selectedMonth - 1]}`} onClear={clearMonth} />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today",         value: todayTotal.toLocaleString() },
          { label: `${cumulativeLabel} Cum.`, value: cumulativeTotal.toLocaleString() },
          { label: "vs Last Month", value: momPct !== 'N/A' ? `${Number(momPct) >= 0 ? '+' : ''}${momPct}%` : 'N/A' },
          { label: "vs Last Year",  value: yoyPct !== 'N/A' ? `${Number(yoyPct) >= 0 ? '+' : ''}${yoyPct}%` : 'N/A' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Today */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Today's Performance</h3>
          {todayData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No data entered today yet</p>
            : <div className="h-[250px]"><Bar data={todayChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="today" defaultText="Performance is steady across shifts today." />
        </div>

        {/* Cumulative — dynamic month/year */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wider">
            Cumulative — {cumulativeLabel}
            {targetValue !== null && (
              <span className="ml-2 text-xs font-normal text-red-500 normal-case">
                — Target: {targetValue.toLocaleString()}
              </span>
            )}
          </h3>
          {(selectedYear !== null || selectedMonth !== null) && (
            <p className="text-xs text-blue-500 mb-3">
              Showing drill-down from {selectedYear !== null ? `${selectedYear}` : ''}{selectedMonth !== null ? ` → ${MONTH_NAMES[selectedMonth - 1]}` : ''}
            </p>
          )}
          {loadingCumulative
            ? <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
            : cumulativeData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No data for {cumulativeLabel} yet</p>
              : <div className="h-[250px]"><Line data={cumulativeChartData} options={commonOptions} /></div>
          }
          <InsightBox section={section} chartType="cumulative" defaultText="Tracking cumulative progress for the month." />
        </div>

        {/* MoM — clickable, filtered by selectedYear */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wider">
            Month on Month Trend
            {selectedYear !== null && (
              <span className="ml-2 text-xs font-normal text-blue-500 normal-case">
                — {selectedYear}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mb-3">Click a bar to drill into that month's cumulative</p>
          {loadingMom
            ? <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
            : momData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">No monthly data available</p>
              : <div className="h-[250px]">
                  <Bar data={momChartData} options={clickableBarOptions(handleMomClick)} />
                </div>
          }
          <InsightBox section={section} chartType="mom" defaultText="Monthly trend comparison." />
        </div>

        {/* YoY — clickable */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wider">Year on Year Comparison</h3>
          <p className="text-xs text-gray-400 mb-3">Click a bar to drill into that year's monthly breakdown</p>
          {yoyData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No year-on-year data available</p>
            : <div className="h-[250px]">
                <Bar data={yoyChartData} options={clickableBarOptions(handleYoyClick)} />
              </div>
          }
          <InsightBox section={section} chartType="yoy" defaultText="Year on year comparison." />
        </div>
      </div>
    </div>
  );
}