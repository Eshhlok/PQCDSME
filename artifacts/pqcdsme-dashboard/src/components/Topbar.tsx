import React, { useEffect, useState, useCallback, useRef } from "react";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AdminModal } from "./AdminModal";
import { api } from "../lib/api";
import { Link } from "wouter";

const PLANT_ID = 1;
const POLL_INTERVAL_MS = 10_000; // refresh alerts every 10s

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { profile, signOut } = useAuth();

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const roleColors: Record<string, string> = {
    admin:    "bg-purple-100 text-purple-800 border-purple-200",
    operator: "bg-blue-100 text-blue-800 border-blue-200",
    viewer:   "bg-gray-100 text-gray-800 border-gray-200",
  };

  const roleColor = profile?.role ? roleColors[profile.role] : roleColors.viewer;
  const [adminOpen, setAdminOpen] = useState(false);
  const [plantName, setPlantName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (profile?.plantId) {
      api.getPlants().then(plants => {
        const match = plants.find((p: any) => p.id === profile.plantId);
        setPlantName(match?.name ?? null);
      });
    }
  }, [profile?.plantId]);

  // Only admins and operators see alerts
  const canSeeAlerts = profile?.role === "admin" || profile?.role === "operator";
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!canSeeAlerts) return;
    try {
      const alerts = await api.getAlerts(PLANT_ID);
      const newCount = alerts.filter((a: any) => !a.read).length;
      setUnreadCount(newCount);
        // Play sound only if unread count increased
      if (newCount > prevUnreadRef.current && prevUnreadRef.current !== 0) {
        audioRef.current?.play().catch(() => {}); // catch blocks autoplay policy errors
      }

      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    } catch {
      // silently fail — alerts are non-critical
    }
  }, [canSeeAlerts]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
  const handler = () => fetchUnread();
  window.addEventListener("alerts-updated", handler);
  return () => window.removeEventListener("alerts-updated", handler);
}, [fetchUnread]);

  return (
    <header className="sticky top-0 z-40 flex h-[52px] w-full items-center justify-between bg-white px-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          data-testid="button-menu"
          title="Menu"
          aria-label="Open menu"
        >
          <img src="/favicon.ico" alt="menu" className="w-7 h-7 rounded-md" />
        </button>
        
        <h1 className="text-base font-semibold text-gray-900 tracking-tight">PQCDSME Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">

        {/* Role badge */}
        {profile?.role && (
          <div className={`px-2.5 py-1 text-xs font-medium rounded-md border capitalize hidden sm:block ${roleColor}`}>
            {profile.fullName ?? profile.role}
          </div>
        )}

        {/* Bell icon — admins + operators only */}
        {canSeeAlerts && (
          <Link href="/alerts" aria-label="View alerts">
            <button className="relative p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-800">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </Link>
        )}

        {/* Admin users button — only visible to admins */}
        {profile?.role === "admin" && (
          <button
            onClick={() => setAdminOpen(true)}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg"
            aria-label="Manage users"
          >
            ⚙ Users
          </button>
        )}

        {/* Plant badge */}
        <div className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md border border-gray-200">
          {plantName ?? (profile?.plantId ? `Plant ${profile.plantId}` : "All Plants")}
        </div>

        {/* Date */}
        <div className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md border border-gray-200 hidden sm:block">
          {today}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-md transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </header>
  );
}