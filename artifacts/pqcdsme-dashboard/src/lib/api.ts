import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Plants
  getPlants: () => request<any[]>('/plants'),
  createPlant: (data: { name: string; location: string }) =>
    request('/plants', { method: 'POST', body: JSON.stringify(data) }),

  // Entries
  getEntries: (params: { plantId: number; section?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams({ plantId: String(params.plantId), ...params as any });
    return request<any[]>(`/entries?${query}`);
  },
  createEntry: (data: { plantId: number; section: string; entryDate: string; shift: string; fieldKey: string; fieldValue: string }) =>
    request('/entries', { method: 'POST', body: JSON.stringify(data) }),

  // Targets
  getTargets: (params: { plantId: number; section?: string; month?: number; year?: number }) => {
    const query = new URLSearchParams({ plantId: String(params.plantId), ...params as any });
    return request<any[]>(`/targets?${query}`);
  },
  createTarget: (data: { plantId: number; section: string; fieldKey: string; targetValue: string; month: number; year: number }) =>
    request('/targets', { method: 'POST', body: JSON.stringify(data) }),

  // Insights
  getInsights: (params: { plantId: number; section?: string; chartType?: string }) => {
    const query = new URLSearchParams({ plantId: String(params.plantId), ...params as any });
    return request<any[]>(`/insights?${query}`);
  },
  createInsight: (data: { plantId: number; section: string; chartType: string; insightText: string; insightDate: string; editedBy?: string }) =>
    request('/insights', { method: 'POST', body: JSON.stringify(data) }),

  // Stats
  getStatsToday: (plantId: number, section: string, fieldKey: string) => {
    const query = new URLSearchParams({ plantId: String(plantId), section, fieldKey });
    return request<{ hour: string; value: number }[]>(`/stats/today?${query}`);
  },
  getStatsCumulative: (plantId: number, section: string, fieldKey: string, month: number, year: number) => {
    const query = new URLSearchParams({ plantId: String(plantId), section, fieldKey, month: String(month), year: String(year) });
    return request<{ date: string; value: number }[]>(`/stats/cumulative?${query}`);
  },
  getStatsMoM: (plantId: number, section: string, fieldKey: string) => {
    const query = new URLSearchParams({ plantId: String(plantId), section, fieldKey });
    return request<{ month: string; monthNum: string; value: number }[]>(`/stats/mom?${query}`);
  },
  getStatsYoY: (plantId: number, section: string, fieldKey: string) => {
    const query = new URLSearchParams({ plantId: String(plantId), section, fieldKey });
    return request<{ year: number; month: string; monthNum: number; value: number }[]>(`/stats/yoy?${query}`);
  },
  // Admin
  getAdminUsers: () =>
    request<{
      id: string;
      fullName: string | null;
      email: string;
      role: "admin" | "operator" | "viewer";
      plantId: number | null;
      createdAt: string;
    }[]>("/admin/users"),

  updateAdminUser: (id: string, data: { role?: string; plantId?: number | null }) =>
    request(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAdminUser: (id: string) =>
    request(`/admin/users/${id}`, { method: "DELETE" }),

  inviteUser: (data: { email: string; role: string; plantId: number | null }) =>
    request("/admin/invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};