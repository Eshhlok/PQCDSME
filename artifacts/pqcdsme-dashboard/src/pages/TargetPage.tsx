// src/pages/TargetsPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PLANT_ID = 1;

const SECTIONS = [
  {
    key: "production",
    label: "Production",
    color: "#378ADD",
    kpis: [
      { key: "target",   label: "Target units (nos)" },
      { key: "actual",   label: "Actual units (nos)" },
      { key: "downtime", label: "Downtime (min)" },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    color: "#1D9E75",
    kpis: [
      { key: "inspected", label: "Total inspected (nos)" },
      { key: "defects",   label: "Defects found (nos)" },
      { key: "rate",      label: "Rejection rate (%)" },
    ],
  },
  {
    key: "cost",
    label: "Cost",
    color: "#BA7517",
    kpis: [
      { key: "budget",  label: "Budget (₹)" },
      { key: "actual",  label: "Actual spend (₹)" },
      { key: "savings", label: "Savings (₹)" },
    ],
  },
  {
    key: "dispatch",
    label: "Dispatch",
    color: "#7F77DD",
    kpis: [
      { key: "planned",    label: "Orders planned (nos)" },
      { key: "dispatched", label: "Dispatched (nos)" },
      { key: "otif",       label: "OTIF (%)" },
    ],
  },
  {
    key: "safety",
    label: "Safety",
    color: "#E24B4A",
    kpis: [
      { key: "near_miss", label: "Near misses (nos)" },
      { key: "lti",       label: "LTI incidents (nos)" },
      { key: "obs",       label: "Observations (nos)" },
    ],
  },
  {
    key: "morale",
    label: "Morale",
    color: "#D4537E",
    kpis: [
      { key: "attendance",  label: "Attendance (%)" },
      { key: "suggestions", label: "Suggestions given (nos)" },
      { key: "training",    label: "Training hours (hr)" },
    ],
  },
  {
    key: "environment",
    label: "Environment",
    color: "#639922",
    kpis: [
      { key: "energy", label: "Energy used (kWh)" },
      { key: "water",  label: "Water consumed (L)" },
      { key: "waste",  label: "Waste generated (kg)" },
    ],
  },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getYearOptions() {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2];
}

export default function TargetsPage() {
  const { profile } = useAuth();
  const now = new Date();

  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());

  const [values, setValues]         = useState<Record<string, string>>({});
  const [lockedKeys, setLockedKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [saved, setSaved]           = useState<Record<string, boolean>>({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const activeSection = SECTIONS[activeSectionIdx];

  useEffect(() => {
    setLoading(true);
    setError(null);
    setValues({});
    setLockedKeys({});

    api.getTargets({
      plantId: PLANT_ID,
      section: activeSection.key,
      month: selectedMonth,
      year: selectedYear,
    })
      .then(targets => {
        const map: Record<string, string>  = {};
        const locked: Record<string, boolean> = {};
        targets.forEach((t: any) => {
          map[t.fieldKey]    = String(t.targetValue);
          locked[t.fieldKey] = true; // already saved — lock it
        });
        setValues(map);
        setLockedKeys(locked);
      })
      .catch(() => setError("Failed to load existing targets."))
      .finally(() => setLoading(false));
  }, [activeSectionIdx, selectedMonth, selectedYear]);

  async function saveKpi(fieldKey: string) {
    const val = values[fieldKey];
    if (val === undefined || val === "") return;

    setSaving(s => ({ ...s, [fieldKey]: true }));
    setError(null);

    try {
      await api.createTarget({
        plantId: PLANT_ID,
        section: activeSection.key,
        fieldKey,
        targetValue: val,
        month: selectedMonth,
        year: selectedYear,
      });
      // Lock after successful save
      setLockedKeys(l => ({ ...l, [fieldKey]: true }));
      setSaved(s => ({ ...s, [fieldKey]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [fieldKey]: false })), 2000);
    } catch {
      setError(`Failed to save target for ${fieldKey}.`);
    } finally {
      setSaving(s => ({ ...s, [fieldKey]: false }));
    }
  }

  async function saveAll() {
    const unlockedKpis = activeSection.kpis.filter(k => !lockedKeys[k.key]);
    await Promise.all(unlockedKpis.map(k => saveKpi(k.key)));
  }

  const hasAnyUnlocked = activeSection.kpis.some(k => !lockedKeys[k.key]);

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-sm text-gray-500">Only admins can set targets.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Set Targets</h2>
        <p className="text-sm text-gray-500">Define monthly KPI targets per section</p>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {getYearOptions().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">

        {/* Section sidebar */}
        <div className="flex flex-col gap-1 shrink-0">
          {SECTIONS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setActiveSectionIdx(i)}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSectionIdx === i ? "text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              style={activeSectionIdx === i ? { backgroundColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* KPI inputs */}
        <div
          className="flex-1 bg-white border border-gray-200 rounded-xl p-5"
          style={{ borderTop: `3px solid ${activeSection.color}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{activeSection.label}</h3>
            <span className="text-xs text-gray-400">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          {error && (
            <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading targets…</p>
          ) : (
            <div className="flex flex-col gap-4">
              {activeSection.kpis.map(kpi => {
                const isLocked = lockedKeys[kpi.key];
                return (
                  <div key={kpi.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">
                          {kpi.label}
                        </label>
                        {isLocked && (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Already set
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={values[kpi.key] ?? ""}
                        readOnly={isLocked}
                        onChange={e => !isLocked && setValues(v => ({ ...v, [kpi.key]: e.target.value }))}
                        placeholder={isLocked ? "" : "Enter target"}
                        className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none transition-colors ${
                          isLocked
                            ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                            : "border-gray-200 focus:ring-2"
                        }`}
                      />
                    </div>

                    {/* Save button — hidden when locked */}
                    {!isLocked && (
                      <button
                        onClick={() => saveKpi(kpi.key)}
                        disabled={saving[kpi.key] || !values[kpi.key]}
                        className="mt-5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[64px] text-center"
                        style={{
                          borderColor: activeSection.color,
                          color: saved[kpi.key] ? "#fff" : activeSection.color,
                          backgroundColor: saved[kpi.key] ? activeSection.color : "transparent",
                        }}
                      >
                        {saving[kpi.key] ? "…" : saved[kpi.key] ? "✓ Saved" : "Save"}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Save all — hidden when all KPIs are locked */}
              {hasAnyUnlocked && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <button
                    onClick={saveAll}
                    className="w-full text-sm font-medium py-2.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: activeSection.color }}
                  >
                    Save all {activeSection.label} targets
                  </button>
                </div>
              )}

              {/* All set message — shown when everything is locked */}
              {!hasAnyUnlocked && (
                <div className="pt-2 border-t border-gray-100 mt-2 text-center">
                  <p className="text-xs text-gray-400">
                    All targets for {activeSection.label} are set for {MONTHS[selectedMonth - 1]} {selectedYear}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}