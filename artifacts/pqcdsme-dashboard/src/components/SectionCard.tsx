import React, { useState } from "react";
import { Link } from "wouter";
import { Check, Loader2, ArrowRight } from "lucide-react";
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
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SectionCardProps {
  title: string;
  subtitle: string;
  color: string;
  link: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  chartData: any;
  readOnly?: boolean;
}

export function SectionCard({ title, subtitle, color, link, children, onSave, chartData, readOnly }: SectionCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  // Derive a muted bg tint from the accent color
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const accentFaint = hexToRgba(color, 0.07);
  const accentMid   = hexToRgba(color, 0.18);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#fff',
        bodyColor: '#ccc',
        padding: 8,
        cornerRadius: 4,
        displayColors: false,
      },
    },
    scales: {
      x: { display: false },
      y: { display: false, beginAtZero: true },
    },
  };

  return (
    <div
      className="section-card flex flex-col bg-white border border-gray-200 rounded-sm overflow-hidden transition-shadow duration-200"
      style={{
        borderTop: `3px solid ${color}`,
        cursor: saving ? 'wait' : 'default',
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-4 py-3 border-b border-gray-100 flex items-center gap-3"
        style={{ background: accentFaint }}
      >
        <div
          className="w-9 h-9 rounded-sm flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {title.charAt(0)}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight tracking-wide">{title}</h3>
          <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
        </div>
      </div>

      {/* ── Inputs ── */}
      <div className="px-4 pt-3 pb-1 flex-1 flex flex-col gap-2.5">
        <div className="grid grid-cols-1 gap-2">
          {React.Children.map(children, child => {
            // Clone each child input wrapper to inject the themed focus ring
            return (
              <div className="input-group">
                {child}
              </div>
            );
          })}
        </div>

        {/* ── Mini bar chart ── */}
        <div className="mt-1 h-[100px] w-full rounded-sm overflow-hidden" style={{ background: accentFaint }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
        <p className="text-[10px] text-gray-400 text-center -mt-1 tracking-widest uppercase">
          Last 7 days
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between"
        style={{ background: '#fafafa' }}
      >
        <Link
          href={link}
          className="group text-[12px] font-semibold flex items-center gap-1 transition-all duration-150 select-none"
          style={{ color, cursor: 'pointer' }}
        >
          View graphs
          <ArrowRight
            className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>

        {!readOnly ? (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              borderColor: saved ? color : color,
              color: saved ? '#fff' : saving ? color : color,
              backgroundColor: saved ? color : saving ? accentMid : 'transparent',
              cursor: saving ? 'wait' : saved ? 'default' : 'pointer',
              minWidth: '76px',
            }}
            className="save-btn px-3 py-1 text-[12px] font-semibold border rounded-sm transition-all duration-200 flex items-center justify-center gap-1.5 select-none hover:shadow-sm active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        ) : (
          <span className="text-[11px] text-gray-400 italic">View only</span>
        )}
      </div>

      <style>{`
        .section-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
        }
        .save-btn:not(:disabled):hover {
          background-color: ${accentMid} !important;
        }
        .input-group input:not(:disabled):not([readonly]) {
          transition: border-color 0.15s, box-shadow 0.15s;
          cursor: text;
        }
        .input-group input:not(:disabled):not([readonly]):hover {
          border-color: ${color}88;
        }
        .input-group input:not(:disabled):not([readonly]):focus {
          border-color: ${color};
          box-shadow: 0 0 0 2px ${accentMid};
          outline: none;
        }
        .input-group input:disabled,
        .input-group input[readonly] {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}