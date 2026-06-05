import React, { useState, useEffect } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";
import { useAuth } from "@/context/AuthContext";

const PLANT_ID = 1;

// Generates last 7 date strings and day labels
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }).charAt(0),
    });
  }
  return days;
}

// Hook — fetches last 7 days of a single field_key for a section
function useLast7Days(section: string, fieldKey: string, color: string, refreshKey: number) {
  const [chartData, setChartData] = useState<any>({
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: color, borderRadius: 2 }]
  });

  useEffect(() => {
    const days = getLast7Days();
    const startDate = days[0].date;
    const endDate   = days[6].date;

    api.getEntries({ plantId: PLANT_ID, section, startDate, endDate })
      .then(entries => {
        const sumByDate: Record<string, number> = {};
        days.forEach(d => { sumByDate[d.date] = 0; });

        entries
          .filter(e => e.fieldKey === fieldKey)        // ✅ was e.field_key
          .forEach(e => {
            if (sumByDate[e.entryDate] !== undefined) { // ✅ was e.entry_date
              sumByDate[e.entryDate] += Number(e.fieldValue) || 0; // ✅ was e.field_value
            }
          });

        setChartData({
          labels: days.map(d => d.label),
          datasets: [{
            data: days.map(d => sumByDate[d.date]),
            backgroundColor: color,
            borderRadius: 2,
          }]
        });
      })
      .catch(() => {});
  }, [section, fieldKey, color,refreshKey]);

  return chartData;
}
export default function Dashboard() {
  // Production State
  const [prodTarget, setProdTarget]   = useState("");
  const [prodActual, setProdActual]   = useState("");
  const [prodDowntime, setProdDowntime] = useState("");

  // Quality State
  const [qualInspected, setQualInspected] = useState("");
  const [qualDefects, setQualDefects]     = useState("");
  const qualRejectionRate = (Number(qualInspected) > 0 && Number(qualDefects) >= 0)
    ? ((Number(qualDefects) / Number(qualInspected)) * 100).toFixed(2)
    : "0.00";

  // Cost State
  const [costBudget, setCostBudget] = useState("");
  const [costActual, setCostActual] = useState("");
  const costSavings = (Number(costBudget) || 0) - (Number(costActual) || 0);

  // Dispatch State
  const [dispPlanned, setDispPlanned] = useState("");
  const [dispActual, setDispActual]   = useState("");
  const dispOtif = (Number(dispPlanned) > 0 && Number(dispActual) >= 0)
    ? ((Number(dispActual) / Number(dispPlanned)) * 100).toFixed(1)
    : "0.0";

  // Safety State
  const [safNearMiss, setSafNearMiss] = useState("");
  const [safLti, setSafLti]           = useState("");
  const [safObs, setSafObs]           = useState("");

  // Morale State
  const [morAtt, setMorAtt]   = useState("");
  const [morSugg, setMorSugg] = useState("");
  const [morTrain, setMorTrain] = useState("");

  // Environment State
  const [envEnergy, setEnvEnergy] = useState("");
  const [envWater, setEnvWater]   = useState("");
  const [envWaste, setEnvWaste]   = useState("");

  const { profile } = useAuth();
  const isViewer = profile?.role === "viewer";
  const [refreshKey, setRefreshKey] = useState(0);

  // Real chart data — one primary KPI per section
  const prodChart = useLast7Days('production', 'actual',     '#378ADD', refreshKey);
  const qualChart = useLast7Days('quality',    'defects',    '#1D9E75', refreshKey);
  const costChart = useLast7Days('cost',       'actual',     '#BA7517', refreshKey);
  const dispChart = useLast7Days('dispatch',   'dispatched', '#7F77DD', refreshKey);
  const safChart  = useLast7Days('safety',     'near_miss',  '#E24B4A', refreshKey);
  const morChart  = useLast7Days('morale',     'attendance', '#D4537E', refreshKey);
  const envChart  = useLast7Days('environment','energy',     '#639922', refreshKey);

  
  const saveToDb = async (section: string, data: Record<string, string | number>) => {
    const today = new Date().toLocaleDateString('en-CA');
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        api.createEntry({
          plantId: PLANT_ID,
          section,
          entryDate: today,
          shift: 'morning',
          fieldKey: key,
          fieldValue: String(value),
        })
      )
    );
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Plant Status</h2>
          <p className="text-sm text-gray-500">Record daily operations metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">

        {/* PRODUCTION */}
        <SectionCard
          title="Production" subtitle="Units & Uptime" color="#378ADD" link="/production"
          chartData={prodChart}
          onSave={() => saveToDb('production', { target: prodTarget, actual: prodActual, downtime: prodDowntime })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Target units (nos)</label>
            <input disabled={isViewer} type="number" value={prodTarget} onChange={e => setProdTarget(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Actual units (nos)</label>
            <input disabled={isViewer} type="number" value={prodActual} onChange={e => setProdActual(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Downtime (min)</label>
            <input disabled={isViewer} type="number" value={prodDowntime} onChange={e => setProdDowntime(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* QUALITY */}
        <SectionCard
          title="Quality" subtitle="Defects & Rejections" color="#1D9E75" link="/quality"
          chartData={qualChart}
          onSave={() => saveToDb('quality', { inspected: qualInspected, defects: qualDefects, rate: qualRejectionRate })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Total inspected (nos)</label>
            <input disabled={isViewer} type="number" value={qualInspected} onChange={e => setQualInspected(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Defects found (nos)</label>
            <input disabled={isViewer} type="number" value={qualDefects} onChange={e => setQualDefects(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Rejection rate (%)</label>
            <input disabled type="text" readOnly value={qualRejectionRate} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* COST */}
        <SectionCard
          title="Cost" subtitle="Budget & Spend" color="#BA7517" link="/cost"
          chartData={costChart}
          onSave={() => saveToDb('cost', { budget: costBudget, actual: costActual, savings: costSavings })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Budget (₹)</label>
            <input disabled={isViewer} type="number" value={costBudget} onChange={e => setCostBudget(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Actual spend (₹)</label>
            <input disabled={isViewer} type="number" value={costActual} onChange={e => setCostActual(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Savings (₹)</label>
            <input disabled type="text" readOnly value={costSavings} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* DISPATCH */}
        <SectionCard
          title="Dispatch" subtitle="Deliveries & OTIF" color="#7F77DD" link="/dispatch"
          chartData={dispChart}
          onSave={() => saveToDb('dispatch', { planned: dispPlanned, dispatched: dispActual, otif: dispOtif })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Orders planned (nos)</label>
            <input disabled={isViewer} type="number" value={dispPlanned} onChange={e => setDispPlanned(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Dispatched (nos)</label>
            <input disabled={isViewer} type="number" value={dispActual} onChange={e => setDispActual(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">OTIF (%)</label>
            <input disabled type="text" readOnly value={dispOtif} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* SAFETY */}
        <SectionCard
          title="Safety" subtitle="Incidents & Observations" color="#E24B4A" link="/safety"
          chartData={safChart}
          onSave={() => saveToDb('safety', { near_miss: safNearMiss, lti: safLti, obs: safObs })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Near misses (nos)</label>
            <input disabled={isViewer} type="number" value={safNearMiss} onChange={e => setSafNearMiss(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">LTI incidents (nos)</label>
            <input disabled={isViewer} type="number" value={safLti} onChange={e => setSafLti(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Observations (nos)</label>
            <input disabled={isViewer} type="number" value={safObs} onChange={e => setSafObs(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* MORALE */}
        <SectionCard
          title="Morale" subtitle="Engagement & Training" color="#D4537E" link="/morale"
          chartData={morChart}
          onSave={() => saveToDb('morale', { attendance: morAtt, suggestions: morSugg, training: morTrain })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Attendance (%)</label>
            <input disabled={isViewer} type="number" value={morAtt} onChange={e => setMorAtt(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-pink-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Suggestions given (nos)</label>
            <input disabled={isViewer} type="number" value={morSugg} onChange={e => setMorSugg(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-pink-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Training hours (hr)</label>
            <input disabled={isViewer} type="number" value={morTrain} onChange={e => setMorTrain(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-pink-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* ENVIRONMENT */}
        <SectionCard
          title="Environment" subtitle="Resources & Waste" color="#639922" link="/environment"
          chartData={envChart}
          onSave={() => saveToDb('environment', { energy: envEnergy, water: envWater, waste: envWaste })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Energy used (kWh)</label>
            <input disabled={isViewer} type="number" value={envEnergy} onChange={e => setEnvEnergy(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Water consumed (L)</label>
            <input disabled={isViewer} type="number" value={envWater} onChange={e => setEnvWater(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Waste generated (kg)</label>
            <input disabled={isViewer} type="number" value={envWaste} onChange={e => setEnvWaste(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
        </SectionCard>

      </div>
    </div>
  );
}