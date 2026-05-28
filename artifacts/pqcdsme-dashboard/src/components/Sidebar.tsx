import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Link, useLocation } from "wouter";

export const sections = [
  { id: "production", label: "Production", color: "#378ADD", path: "/production" },
  { id: "quality", label: "Quality", color: "#1D9E75", path: "/quality" },
  { id: "cost", label: "Cost", color: "#BA7517", path: "/cost" },
  { id: "dispatch", label: "Dispatch", color: "#7F77DD", path: "/dispatch" },
  { id: "safety", label: "Safety", color: "#E24B4A", path: "/safety" },
  { id: "morale", label: "Morale", color: "#D4537E", path: "/morale" },
  { id: "environment", label: "Environment", color: "#639922", path: "/environment" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="font-semibold text-sm text-gray-900">Navigation</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          <Link href="/" onClick={onClose} className={`flex items-center px-3 py-2.5 rounded-md mb-2 transition-colors ${location === '/' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
            <span className="w-3 h-3 rounded-full bg-gray-400 mr-3" />
            Dashboard Home
          </Link>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-3 mt-4">
            Sections
          </div>
          <div className="flex flex-col gap-1">
            {sections.map((section) => (
              <Link 
                key={section.id} 
                href={section.path}
                onClick={onClose}
                className={`flex items-center px-3 py-2.5 rounded-md transition-colors ${
                  location === section.path 
                    ? 'bg-gray-100 text-gray-900 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span 
                  className="w-3 h-3 rounded-full mr-3 shrink-0" 
                  style={{ backgroundColor: section.color }} 
                />
                {section.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
