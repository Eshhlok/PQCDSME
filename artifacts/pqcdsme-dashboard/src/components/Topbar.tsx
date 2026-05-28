import React from "react";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AdminModal } from "./AdminModal";
import { useEffect,useState } from "react";
import {api} from "../lib/api";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { profile, signOut } = useAuth();

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 border-purple-200",
    operator: "bg-blue-100 text-blue-800 border-blue-200",
    viewer: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const roleColor = profile?.role ? roleColors[profile.role] : roleColors.viewer;
  const [adminOpen, setAdminOpen] = useState(false);
  const [plantName, setPlantName] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.plantId) {
      api.getPlants().then(plants => {
        const match = plants.find(p => p.id === profile.plantId);
        setPlantName(match?.name ?? null);
      });
    }
  }, [profile?.plantId]);

  return (
      <header className="sticky top-0 z-40 flex h-[52px] w-full items-center justify-between bg-white px-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
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

          {/* Admin users button — only visible to admins */}
          {profile?.role === "admin" && (
            <>
              <button
                onClick={() => setAdminOpen(true)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg"
              >
                ⚙ Users
              </button>
              <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
            </>
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
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

        {/* Modal rendered outside the flex row so it overlays correctly */}
        <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
      </header>
  );
}