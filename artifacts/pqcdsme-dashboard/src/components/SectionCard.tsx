import React, { useState } from "react";
import { Link } from "wouter";
import { Check, Edit2 } from "lucide-react";
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
    await onSave();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col bg-white border border-gray-200" style={{ borderTop: `3px solid ${color}` }}>
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: color }}>
          {title.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3">
          {children}
        </div>
        
        <div className="mt-2 h-[120px] w-full">
          <Bar 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } }
            }} 
          />
        </div>
        <p className="text-[11px] text-gray-400 text-center -mt-2">Last 7 days trend</p>
      </div>

      <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <Link
          href={link}
          className="text-sm font-medium hover:underline flex items-center gap-1 transition-colors"
          style={{ color }}
        >
          View graphs →
        </Link>

        {!readOnly ? (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="px-4 py-1.5 text-sm font-medium border rounded transition-colors flex items-center justify-center min-w-[70px]"
            style={{
              borderColor: color,
              color: saved ? '#fff' : color,
              backgroundColor: saved ? color : 'transparent'
            }}
          >
            {saved ? <Check className="w-4 h-4" /> : 'Save'}
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">View only</span>
        )}
      </div>
    </div>
  );
}
