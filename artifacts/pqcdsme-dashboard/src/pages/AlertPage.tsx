import React, { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { ChevronLeft, Bell, AlertTriangle, AlertCircle, CheckCheck, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

const PLANT_ID = 1;

interface Alert {
  key: string;
  type: "missed_entry" | "below_target";
  severity: "warning" | "critical";
  title: string;
  description: string;
  section: string;
  read: boolean;
}

const SECTION_COLORS: Record<string, string> = {
  production:  "#378ADD",
  quality:     "#1D9E75",
  cost:        "#BA7517",
  dispatch:    "#7F77DD",
  safety:      "#E24B4A",
  morale:      "#D4537E",
  environment: "#639922",
};

export function AlertsPage() {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState<Set<string>>(new Set());
  const [filter, setFilter]     = useState<"all" | "unread">("unread");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(PLANT_ID);
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function markRead(keys: string[]) {
    setMarking(prev => new Set([...prev, ...keys]));
    try {
      await api.markAlertsRead(keys);
      setAlerts(prev => prev.map(a => keys.includes(a.key) ? { ...a, read: true } : a));
      window.dispatchEvent(new Event("alerts-updated"));
    } catch (err) {
      console.error("Failed to mark alerts read:", err);
    } finally {
      setMarking(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.delete(k));
        return next;
      });
    }
  }

  async function markAllRead() {
    const unreadKeys = alerts.filter(a => !a.read).map(a => a.key);
    if (!unreadKeys.length) return;
    await markRead(unreadKeys);
  }

  const displayed = filter === "unread" ? alerts.filter(a => !a.read) : alerts;
  const unreadCount = alerts.filter(a => !a.read).length;

  const missedAlerts  = displayed.filter(a => a.type === "missed_entry");
  const targetAlerts  = displayed.filter(a => a.type === "below_target");

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Alerts</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "unread"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f === "all" ? `All (${alerts.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading alerts…
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">
            {filter === "unread" ? "No unread alerts — you're all caught up!" : "No alerts at the moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Below target */}
          {targetAlerts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                📉 Below Target ({targetAlerts.length})
              </h3>
              <div className="space-y-2">
                {targetAlerts.map(alert => (
                  <AlertCard
                    key={alert.key}
                    alert={alert}
                    marking={marking.has(alert.key)}
                    onMarkRead={() => markRead([alert.key])}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Missed entries */}
          {missedAlerts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                ⏰ Missed Entries ({missedAlerts.length})
              </h3>
              <div className="space-y-2">
                {missedAlerts.map(alert => (
                  <AlertCard
                    key={alert.key}
                    alert={alert}
                    marking={marking.has(alert.key)}
                    onMarkRead={() => markRead([alert.key])}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, marking, onMarkRead }: {
  alert: Alert;
  marking: boolean;
  onMarkRead: () => void;
}) {
  const sectionColor = SECTION_COLORS[alert.section] ?? "#6b7280";
  const isCritical = alert.severity === "critical";

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
      alert.read
        ? "bg-white border-gray-100 opacity-60"
        : isCritical
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
    }`}>
      {/* Severity icon */}
      <div className="mt-0.5 shrink-0">
        {isCritical
          ? <AlertCircle className="w-5 h-5 text-red-500" />
          : <AlertTriangle className="w-5 h-5 text-amber-500" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${alert.read ? "text-gray-500" : "text-gray-900"}`}>
            {alert.title}
          </p>
          {/* Section dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: sectionColor }}
            title={alert.section}
          />
          {/* Severity badge */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
            isCritical
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {alert.severity}
          </span>
          {alert.read && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded uppercase tracking-wide">
              read
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
      </div>

      {/* Mark read button */}
      {!alert.read && (
        <button
          onClick={onMarkRead}
          disabled={marking}
          className="shrink-0 text-xs text-gray-400 hover:text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-40"
          title="Mark as read"
        >
          {marking ? "…" : <CheckCheck className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}