import React, { useEffect, useState } from "react";
import { X, LayoutDashboard, Target, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";

export const sections = [
  { id: "production",  label: "Production",  color: "#378ADD", path: "/production",  abbr: "PRD" },
  { id: "quality",     label: "Quality",     color: "#1D9E75", path: "/quality",     abbr: "QLT" },
  { id: "cost",        label: "Cost",        color: "#BA7517", path: "/cost",        abbr: "CST" },
  { id: "dispatch",    label: "Dispatch",    color: "#7F77DD", path: "/dispatch",    abbr: "DSP" },
  { id: "safety",      label: "Safety",      color: "#E24B4A", path: "/safety",      abbr: "SFT" },
  { id: "morale",      label: "Morale",      color: "#D4537E", path: "/morale",      abbr: "MRL" },
  { id: "environment", label: "Environment", color: "#639922", path: "/environment", abbr: "ENV" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { profile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => setMounted(true), 10);
    else setMounted(false);
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(10,12,18,0.72)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full flex flex-col transform transition-transform duration-300 ease-in-out`}
        style={{
          width: "248px",
          background: "linear-gradient(180deg, #0f1117 0%, #141720 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* ── Brand header ── */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* Logo mark — coloured segments */}
            <div className="flex gap-[3px] items-end h-5">
              {sections.slice(0, 4).map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    width: 4,
                    height: `${10 + i * 3}px`,
                    backgroundColor: s.color,
                    borderRadius: 1,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: "'DM Mono', 'Courier New', monospace",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "0.12em",
                color: "#e8eaf0",
                textTransform: "uppercase",
              }}
            >
              PQCDSME
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: 28,
              height: 28,
              color: "#6b7280",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e8eaf0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
            data-testid="button-close-sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Nav body ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">

          {/* Dashboard Home */}
          <div>
            <NavItem
              href="/"
              active={isActive("/")}
              onClick={onClose}
              icon={<LayoutDashboard className="w-3.5 h-3.5" />}
              label="Dashboard Home"
              accent="#6b7280"
              index={0}
              mounted={mounted}
            />
          </div>

          {/* Sections */}
          <div>
            <SectionLabel>Sections</SectionLabel>
            <div className="flex flex-col gap-0.5 mt-2">
              {sections.map((section, i) => (
                <NavItem
                  key={section.id}
                  href={section.path}
                  active={isActive(section.path)}
                  onClick={onClose}
                  icon={
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: section.color,
                        minWidth: 28,
                        textAlign: "center",
                      }}
                    >
                      {section.abbr}
                    </span>
                  }
                  label={section.label}
                  accent={section.color}
                  index={i + 1}
                  mounted={mounted}
                />
              ))}
            </div>
          </div>

          {/* Admin */}
          {profile?.role === "admin" && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
              <SectionLabel>Admin</SectionLabel>
              <div className="mt-2">
                <NavItem
                  href="/targets"
                  active={isActive("/targets")}
                  onClick={onClose}
                  icon={<Target className="w-3.5 h-3.5" />}
                  label="Set Targets"
                  accent="#f59e0b"
                  index={sections.length + 2}
                  mounted={mounted}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #378ADD, #7F77DD)" }}
          >
            {profile?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }} className="truncate">
              {profile?.fullName ?? "User"}
            </p>
            <p style={{ fontSize: 10, color: "#4b5563", textTransform: "capitalize" }}>
              {profile?.role ?? "viewer"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');

        .nav-item-enter {
          animation: navSlideIn 0.25s ease both;
        }
        @keyframes navSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

/* ── Sub-components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "#374151",
      textTransform: "uppercase",
      paddingLeft: 10,
      fontFamily: "'DM Mono', monospace",
    }}>
      {children}
    </p>
  );
}

interface NavItemProps {
  href: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: string;
  index: number;
  mounted: boolean;
}

function NavItem({ href, active, onClick, icon, label, accent, index, mounted }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onClick={onClick}
      className="nav-item-enter"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 4,
        cursor: "pointer",
        position: "relative",
        textDecoration: "none",
        animationDelay: mounted ? `${index * 35}ms` : "0ms",
        transition: "background 0.15s",
        background: active
          ? `rgba(${hexToRgb(accent)}, 0.12)`
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        borderLeft: active ? `2px solid ${accent}` : "2px solid transparent",
        marginLeft: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <span style={{ color: active ? accent : hovered ? "#9ca3af" : "#4b5563", transition: "color 0.15s", display: "flex", alignItems: "center" }}>
        {icon}
      </span>

      {/* Label */}
      <span style={{
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "#f0f2f8" : hovered ? "#d1d5db" : "#6b7280",
        letterSpacing: "0.02em",
        transition: "color 0.15s",
        flex: 1,
        fontFamily: "system-ui, sans-serif",
      }}>
        {label}
      </span>

      {/* Chevron */}
      {active && (
        <ChevronRight
          className="w-3 h-3 shrink-0"
          style={{ color: accent, opacity: 0.7 }}
        />
      )}
    </Link>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}