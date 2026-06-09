import React, { useRef, useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PLANT_ID = 1;

const SECTIONS = [
  { key: "production",  label: "Production",  fieldKey: "actual",      targetFieldKey: "target"      },
  { key: "quality",     label: "Quality",     fieldKey: "defects",     targetFieldKey: "defects"     },
  { key: "cost",        label: "Cost",        fieldKey: "actual",      targetFieldKey: "budget"      },
  { key: "dispatch",    label: "Dispatch",    fieldKey: "dispatched",  targetFieldKey: "planned"     },
  { key: "safety",      label: "Safety",      fieldKey: "near_miss",   targetFieldKey: "near_miss"   },
  { key: "morale",      label: "Morale",      fieldKey: "attendance",  targetFieldKey: "attendance"  },
  { key: "environment", label: "Environment", fieldKey: "energy",      targetFieldKey: "energy"      },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

interface SectionStat {
  key: SectionKey;
  label: string;
  cumulativeValue: number | null;
  targetValue: number | null;
  trend: "up" | "down" | "neutral";
}

// ── helpers ────────────────────────────────────────────────────────────────

function getISTMonthYear(): { month: number; year: number } {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return { month: ist.getUTCMonth() + 1, year: ist.getUTCFullYear() };
}

function trendIcon(t: SectionStat["trend"]) {
  return t === "up" ? "↑" : t === "down" ? "↓" : "→";
}
function trendColor(t: SectionStat["trend"]) {
  return t === "up" ? "#16a34a" : t === "down" ? "#dc2626" : "#6b7280";
}

async function exportToPDF(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgW = 210;
  const pageH = 297;
  const imgH = (canvas.height * imgW) / canvas.width;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });

  pdf.setProperties({
    title: "PQCDSME Manager Report",
    author: "Eshlok Agarwal",
    creator: "PQCDSME Dashboard",
  });

  let yOffset = 0;
  let remaining = imgH;
  while (remaining > 0) {
    const sliceH = Math.min(remaining, pageH);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = (sliceH / imgH) * canvas.height;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(
      canvas,
      0, (yOffset / imgH) * canvas.height,
      canvas.width, sliceCanvas.height,
      0, 0, canvas.width, sliceCanvas.height
    );
    if (yOffset > 0) pdf.addPage();
    pdf.addImage(sliceCanvas.toDataURL("image/png", 0.95), "PNG", 0, 0, imgW, sliceH, "", "FAST");
    yOffset += sliceH;
    remaining -= sliceH;
  }
  pdf.save(filename);
}

// ── component ──────────────────────────────────────────────────────────────

const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<SectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const { month, year } = getISTMonthYear();
  const dateLabel = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch cumulative + targets for all sections in parallel
        const results = await Promise.all(
          SECTIONS.map(async (s) => {
            const [cumulativeData, targetData] = await Promise.all([
              api.getStatsCumulative(PLANT_ID, s.key, s.fieldKey, month, year),
              api.getTargets({ plantId: PLANT_ID, section: s.key, month, year }),
            ]);

            // Cumulative = sum of all daily values this month
            const cumulativeValue = cumulativeData.length > 0
              ? cumulativeData.reduce((sum, d) => sum + (d.value ?? 0), 0)
              : null;

            // Target = the target row for this section's target field key
            const targetRow = (targetData as any[]).find(
              (t: any) => t.fieldKey === s.targetFieldKey
            );
            const targetValue = targetRow ? Number(targetRow.targetValue) : null;

            // Trend: compare last 2 days
            const sorted = [...cumulativeData].sort((a, b) => a.date.localeCompare(b.date));
            let trend: SectionStat["trend"] = "neutral";
            if (sorted.length >= 2) {
              const last = sorted[sorted.length - 1].value;
              const prev = sorted[sorted.length - 2].value;
              trend = last > prev ? "up" : last < prev ? "down" : "neutral";
            }

            return { key: s.key, label: s.label, cumulativeValue, targetValue, trend } satisfies SectionStat;
          })
        );

        if (!cancelled) setStats(results);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load report data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportToPDF(reportRef.current, `PQCDSME-Report-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Loading report data…
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>
  );

  const onTarget  = stats.filter(s => s.cumulativeValue !== null && s.targetValue !== null && s.cumulativeValue >= s.targetValue).length;
  const belowTarget = stats.filter(s => s.cumulativeValue !== null && s.targetValue !== null && s.cumulativeValue < s.targetValue).length;
  const trendingUp  = stats.filter(s => s.trend === "up").length;
  const noData      = stats.filter(s => s.cumulativeValue === null).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Export button — outside printable area */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:bg-orange-800 text-white font-semibold text-sm transition-colors"
        >
          {exporting ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-6.36-.7.7M6.34 17.66l-.7.7M17.66 17.66l.7.7M6.34 6.34l.7.7" />
              </svg>
              Generating PDF…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0-4-4m4 4 4-4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
              </svg>
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* ── Printable report ─────────────────────────────────────────────── */}
      <div ref={reportRef} className="bg-white text-gray-900 rounded-xl shadow-lg p-8" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-100">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">PQCDSME Manager Report</h1>
            <p className="mt-1 text-gray-500 text-sm">{monthLabel} · Generated {dateLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Prepared by</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{user?.email ?? "Eshlok Agarwal"}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "On target",     value: onTarget,    color: "#16a34a" },
            { label: "Below target",  value: belowTarget, color: "#dc2626" },
            { label: "Trending up",   value: trendingUp,  color: "#2563eb" },
            { label: "No data",       value: noData,      color: "#d97706" },
          ].map(card => (
            <div key={card.label} className="rounded-lg p-4" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <p className="text-3xl font-bold" style={{ color: card.color }}>
                {card.value}
                <span className="text-base font-normal text-gray-400">/{SECTIONS.length}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Detail table */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
              {["Section", "Cumulative", "Monthly Target", "Attainment", "Trend"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, idx) => {
              const attainment = s.cumulativeValue !== null && s.targetValue !== null
                ? (s.cumulativeValue / s.targetValue) * 100
                : null;
              const onTgt = attainment !== null && attainment >= 100;

              return (
                <tr key={s.key} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: "#1e293b" }}>
                        {s.key[0].toUpperCase()}
                      </span>
                      {s.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {s.cumulativeValue !== null ? s.cumulativeValue.toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {s.targetValue !== null ? s.targetValue.toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {attainment !== null ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: onTgt ? "#16a34a" : "#dc2626" }}>
                          {Math.round(attainment)}%
                        </span>
                        <span className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#e5e7eb", minWidth: 60 }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.min(attainment, 100)}%`, backgroundColor: onTgt ? "#16a34a" : "#dc2626", borderRadius: 9999 }} />
                        </span>
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-base" style={{ color: trendColor(s.trend) }}>
                      {trendIcon(s.trend)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 flex items-center justify-between text-xs text-gray-400" style={{ borderTop: "1px solid #e5e7eb" }}>
          <span>PQCDSME Dashboard — Confidential</span>
          <span>Eshlok Agarwal · <span style={{ color: "#f97316" }}>https://www.linkedin.com/in/eshlok-agarwal-134877380/</span></span>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;