import React, { useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";
import { useAuth } from "@/context/AuthContext";

const PLANT_ID = 1;
const getDummyChartData = (color: string) => ({
  labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  datasets: [{
    data: [12, 19, 15, 22, 18, 25, 20],
    backgroundColor: color,
    borderRadius: 2
  }]
});


export default function Dashboard() {
  // Production State
  const [prodTarget, setProdTarget] = useState("");
  const [prodActual, setProdActual] = useState("");
  const [prodDowntime, setProdDowntime] = useState("");

  // Quality State
  const [qualInspected, setQualInspected] = useState("");
  const [qualDefects, setQualDefects] = useState("");
  const qualRejectionRate = (Number(qualInspected) > 0 && Number(qualDefects) >= 0) 
    ? ((Number(qualDefects) / Number(qualInspected)) * 100).toFixed(2) 
    : "0.00";

  // Cost State
  const [costBudget, setCostBudget] = useState("");
  const [costActual, setCostActual] = useState("");
  const costSavings = (Number(costBudget) || 0) - (Number(costActual) || 0);

  // Dispatch State
  const [dispPlanned, setDispPlanned] = useState("");
  const [dispActual, setDispActual] = useState("");
  const dispOtif = (Number(dispPlanned) > 0 && Number(dispActual) >= 0)
    ? ((Number(dispActual) / Number(dispPlanned)) * 100).toFixed(1)
    : "0.0";

  // Safety State
  const [safNearMiss, setSafNearMiss] = useState("");
  const [safLti, setSafLti] = useState("");
  const [safObs, setSafObs] = useState("");

  // Morale State
  const [morAtt, setMorAtt] = useState("");
  const [morSugg, setMorSugg] = useState("");
  const [morTrain, setMorTrain] = useState("");

  // Environment State
  const [envEnergy, setEnvEnergy] = useState("");
  const [envWater, setEnvWater] = useState("");
  const [envWaste, setEnvWaste] = useState("");

  const { profile } = useAuth();
  const isViewer = profile?.role === "viewer";

  const saveToDb = async (section: string, data: Record<string, string | number>) => {
    const today = new Date().toISOString().split('T')[0];
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        api.createEntry({
          plantId: 1,
          section,
          entryDate: today,
          shift: 'morning',
          fieldKey: key,
          fieldValue: String(value),
        })
      )
    );
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
          title="Production" subtitle="Units & Uptime" color="#378ADD" link="/production" chartData={getDummyChartData("#378ADD")}
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
          title="Quality" subtitle="Defects & Rejections" color="#1D9E75" link="/quality" chartData={getDummyChartData("#1D9E75")}
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
            <input disabled={isViewer} type="text" readOnly value={qualRejectionRate} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* COST */}
        <SectionCard 
          title="Cost" subtitle="Budget & Spend" color="#BA7517" link="/cost" chartData={getDummyChartData("#BA7517")}
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
            <input disabled={isViewer} type="text" readOnly value={costSavings} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* DISPATCH */}
        <SectionCard 
          title="Dispatch" subtitle="Deliveries & OTIF" color="#7F77DD" link="/dispatch" chartData={getDummyChartData("#7F77DD")}
          onSave={() => saveToDb('dispatch', { planned: dispPlanned, dispatched: dispActual, otif: dispOtif })}
          readOnly={isViewer}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Orders planned (nos)</label>
            <input disabled={isViewer} type="number" value={prodTarget} onChange={e => setProdTarget(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Dispatched (nos)</label>
            <input disabled={isViewer} type="number" value={dispActual} onChange={e => setDispActual(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">OTIF (%)</label>
            <input disabled={isViewer} type="text" readOnly value={dispOtif} className="border border-gray-200 bg-gray-50 text-gray-500 rounded px-2 py-1 text-sm cursor-not-allowed" />
          </div>
        </SectionCard>

        {/* SAFETY */}
        <SectionCard 
          title="Safety" subtitle="Incidents & Observations" color="#E24B4A" link="/safety" chartData={getDummyChartData("#E24B4A")}
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
          title="Morale" subtitle="Engagement & Training" color="#D4537E" link="/morale" chartData={getDummyChartData("#D4537E")}
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
          title="Environment" subtitle="Resources & Waste" color="#639922" link="/environment" chartData={getDummyChartData("#639922")}
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
