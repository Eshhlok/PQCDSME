import React, { useEffect, useState } from "react";
import { X, LayoutDashboard, Target, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";

export const sections = [
  { id: "production",  label: "Production",  color: "#378ADD", path: "/production"  },
  { id: "quality",     label: "Quality",     color: "#1D9E75", path: "/quality"     },
  { id: "cost",        label: "Cost",        color: "#BA7517", path: "/cost"        },
  { id: "dispatch",    label: "Dispatch",    color: "#7F77DD", path: "/dispatch"    },
  { id: "safety",      label: "Safety",      color: "#E24B4A", path: "/safety"      },
  { id: "morale",      label: "Morale",      color: "#D4537E", path: "/morale"      },
  { id: "environment", label: "Environment", color: "#639922", path: "/environment" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-white flex flex-col transform transition-transform duration-300 ease-in-out`}
        style={{
          borderRight: "1px solid #e5e7eb",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          boxShadow: open ? "4px 0 24px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1f2937", letterSpacing: "-0.01em" }}>
            Navigation
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            style={{ cursor: "pointer" }}
            data-testid="button-close-sidebar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ── Nav ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">

          {/* Home */}
          <NavItem
            href="/"
            active={isActive("/")}
            onClick={onClose}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard Home"
            accent="#6b7280"
          />

          {/* Sections */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 8, marginBottom: 6 }}>
              Sections
            </p>
            <div className="flex flex-col gap-0.5">
              {sections.map(section => (
                <NavItem
                  key={section.id}
                  href={section.path}
                  active={isActive(section.path)}
                  onClick={onClose}
                  icon={
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: section.color }}
                    />
                  }
                  label={section.label}
                  accent={section.color}
                />
              ))}
            </div>
          </div>

          {/* Admin */}
          {profile?.role === "admin" && (
            <div className="border-t border-gray-100 pt-4">
              <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: 8, marginBottom: 6 }}>
                Admin
              </p>
              <NavItem
                href="/targets"
                active={isActive("/targets")}
                onClick={onClose}
                icon={<Target className="w-4 h-4" />}
                label="Set Targets"
                accent="#BA7517"
              />
            </div>
          )}
        </div>

        {/* ── User footer ── */}
        {profile && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ fontSize: 13, background: "linear-gradient(135deg, #378ADD, #7F77DD)" }}
            >
              {profile.fullName?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 13, fontWeight: 500, color: "#374151" }} className="truncate leading-tight">
                {profile.fullName ?? "User"}
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>
                {profile.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── NavItem ── */
interface NavItemProps {
  href: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: string;
}

function NavItem({ href, active, onClick, icon, label, accent }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const hexToRgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
        cursor: "pointer",
        textDecoration: "none",
        transition: "background 0.15s",
        background: active
          ? hexToRgba(accent, 0.1)
          : hovered
          ? "#f9fafb"
          : "transparent",
        borderLeft: `3px solid ${active ? accent : "transparent"}`,
      }}
    >
      {/* Icon */}
      <span style={{ color: active ? accent : "#9ca3af", transition: "color 0.15s", display: "flex", alignItems: "center" }}>
        {icon}
      </span>

      {/* Label */}
      <span style={{
        fontSize: 15,           // ← was 13
        fontWeight: active ? 600 : 400,
        color: active ? "#111827" : hovered ? "#374151" : "#6b7280",
        transition: "color 0.15s",
        flex: 1,
      }}>
        {label}
      </span>

      {/* Active chevron */}
      {active && (
        <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: accent, opacity: 0.6 }} />
      )}
    </Link>
  );
}