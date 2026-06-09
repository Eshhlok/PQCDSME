// src/components/AdminModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Role = "admin" | "operator" | "viewer";
type Tab  = "users" | "shifts";

interface AdminUser {
  id: string;
  fullName: string | null;
  email: string;
  role: Role;
  plantId: number | null;
  createdAt: string;
}

interface Shift {
  id: number;
  plantId: number;
  name: string;
  startTime: string;
  endTime: string;
}

const PLANTS = [{ id: 1, name: "Plant A" }];
const ROLES: Role[] = ["admin", "operator", "viewer"];
const PLANT_ID = 1;

const ROLE_PILL: Record<Role, string> = {
  admin:    "bg-purple-100 text-purple-700",
  operator: "bg-blue-100 text-blue-700",
  viewer:   "bg-gray-100 text-gray-500",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  // ── Users state ──────────────────────────────────────────────────────────
  const [users, setUsers]               = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [edits, setEdits]               = useState<Record<string, { role: Role; plantId: number | null }>>({});
  const [saving, setSaving]             = useState<Record<string, boolean>>({});
  const [deleting, setDeleting]         = useState<Record<string, boolean>>({});

  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState<Role>("operator");
  const [invitePlant, setInvitePlant]   = useState<number | null>(1);
  const [inviting, setInviting]         = useState(false);
  const [inviteDone, setInviteDone]     = useState(false);

  // ── Shifts state ─────────────────────────────────────────────────────────
  const [shifts, setShifts]                 = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts]   = useState(false);
  const [shiftError, setShiftError]         = useState<string | null>(null);
  const [newShift, setNewShift]             = useState({ name: "", startTime: "", endTime: "" });
  const [addingShift, setAddingShift]       = useState(false);
  const [shiftEdits, setShiftEdits]         = useState<Record<number, { name: string; startTime: string; endTime: string }>>({});
  const [savingShift, setSavingShift]       = useState<Record<number, boolean>>({});
  const [deletingShift, setDeletingShift]   = useState<Record<number, boolean>>({});

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
      loadShifts();
      setInviteDone(false);
      setError(null);
      setShiftError(null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Users ────────────────────────────────────────────────────────────────

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
      const initialEdits: typeof edits = {};
      data.forEach(u => { initialEdits[u.id] = { role: u.role, plantId: u.plantId }; });
      setEdits(initialEdits);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  function patchEdit(id: string, patch: Partial<{ role: Role; plantId: number | null }>) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function isDirty(u: AdminUser) {
    const e = edits[u.id];
    if (!e) return false;
    return e.role !== u.role || e.plantId !== u.plantId;
  }

  async function saveUser(u: AdminUser) {
    const e = edits[u.id];
    if (!e) return;
    setSaving(s => ({ ...s, [u.id]: true }));
    setError(null);
    try {
      await api.updateAdminUser(u.id, { role: e.role, plantId: e.plantId });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...e } : x));
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(s => ({ ...s, [u.id]: false }));
    }
  }

  async function deleteUser(id: string) {
    if (id === user?.id) { setError("You cannot delete your own account."); return; }
    if (!confirm("Permanently remove this user? This cannot be undone.")) return;
    setDeleting(d => ({ ...d, [id]: true }));
    setError(null);
    try {
      await api.deleteAdminUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch {
      setError("Failed to delete user.");
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setInviteDone(false);
    try {
      await api.inviteUser({ email: inviteEmail.trim(), role: inviteRole, plantId: invitePlant });
      setInviteDone(true);
      setInviteEmail("");
      await loadUsers();
    } catch {
      setError("Invite failed — email may already be registered.");
    } finally {
      setInviting(false);
    }
  }

  // ── Shifts ───────────────────────────────────────────────────────────────

  async function loadShifts() {
    setLoadingShifts(true);
    setShiftError(null);
    try {
      const data = await api.getShifts(PLANT_ID);
      setShifts(data);
      const editsInit: typeof shiftEdits = {};
      data.forEach(s => { editsInit[s.id] = { name: s.name, startTime: s.startTime, endTime: s.endTime }; });
      setShiftEdits(editsInit);
    } catch {
      setShiftError("Failed to load shifts.");
    } finally {
      setLoadingShifts(false);
    }
  }

  function isShiftDirty(s: Shift) {
    const e = shiftEdits[s.id];
    if (!e) return false;
    return e.name !== s.name || e.startTime !== s.startTime || e.endTime !== s.endTime;
  }

  async function saveShift(s: Shift) {
    const e = shiftEdits[s.id];
    if (!e) return;
    setSavingShift(prev => ({ ...prev, [s.id]: true }));
    setShiftError(null);
    try {
      const updated = await api.updateShift(s.id, e);
      setShifts(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch {
      setShiftError("Failed to save shift.");
    } finally {
      setSavingShift(prev => ({ ...prev, [s.id]: false }));
    }
  }

  async function deleteShift(id: number) {
    if (!confirm("Delete this shift? Missed-entry alerts will no longer fire for it.")) return;
    setDeletingShift(prev => ({ ...prev, [id]: true }));
    try {
      await api.deleteShift(id);
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch {
      setShiftError("Failed to delete shift.");
    } finally {
      setDeletingShift(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleAddShift() {
    if (!newShift.name || !newShift.startTime || !newShift.endTime) {
      setShiftError("All shift fields are required.");
      return;
    }
    setAddingShift(true);
    setShiftError(null);
    try {
      const created = await api.createShift({ plantId: PLANT_ID, ...newShift });
      setShifts(prev => [...prev, created]);
      setShiftEdits(prev => ({ ...prev, [created.id]: { name: created.name, startTime: created.startTime, endTime: created.endTime } }));
      setNewShift({ name: "", startTime: "", endTime: "" });
    } catch {
      setShiftError("Failed to create shift.");
    } finally {
      setAddingShift(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Admin Panel</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage users, roles, plants and shifts</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
            className="text-gray-500 hover:text-gray-700 text-lg leading-none"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          {(["users", "shifts"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab}
              className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "users" ? "👤 Users" : "🕐 Shifts"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── USERS TAB ── */}
          {activeTab === "users" && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-4 text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              {/* Invite form */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Invite new user</h3>
                {inviteDone && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
                    Invite sent! The user will receive an email to set their password.
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Email */}
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="invite-email" className="text-xs text-gray-500 font-medium">Email address</label>
                    <input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Role */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="invite-role" className="text-xs text-gray-500 font-medium">Role</label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as Role)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                  {/* Plant */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="invite-plant" className="text-xs text-gray-500 font-medium">Plant</label>
                    <select
                      id="invite-plant"
                      value={invitePlant ?? ""}
                      onChange={e => setInvitePlant(e.target.value ? Number(e.target.value) : null)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No plant</option>
                      {PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {/* Submit — align to bottom */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-transparent select-none">Send</span>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {inviting ? "Sending…" : "Send invite"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Users table */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  All users {!loadingUsers && <span className="text-gray-500 font-normal">({users.length})</span>}
                </h3>
                {loadingUsers ? (
                  <div className="text-sm text-gray-500 py-8 text-center">Loading users…</div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 text-center">No users found.</div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {users.map(u => {
                      const e = edits[u.id] ?? { role: u.role, plantId: u.plantId };
                      const dirty = isDirty(u);
                      const isSelf = u.id === user?.id;
                      return (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {u.fullName ?? <span className="text-gray-500 italic">Pending</span>}
                              {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          {!dirty && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_PILL[u.role]}`}>{u.role}</span>
                          )}
                          <label htmlFor={`role-${u.id}`} className="sr-only">Role for {u.fullName ?? u.email}</label>
                          <select
                            id={`role-${u.id}`}
                            value={e.role}
                            disabled={isSelf}
                            onChange={ev => patchEdit(u.id, { role: ev.target.value as Role })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                          <label htmlFor={`plant-${u.id}`} className="sr-only">Plant for {u.fullName ?? u.email}</label>
                          <select
                            id={`plant-${u.id}`}
                            value={e.plantId ?? ""}
                            onChange={ev => patchEdit(u.id, { plantId: ev.target.value ? Number(ev.target.value) : null })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">No plant</option>
                            {PLANTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          {dirty && (
                            <button
                              onClick={() => saveUser(u)}
                              disabled={saving[u.id]}
                              className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving[u.id] ? "Saving…" : "Save"}
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={deleting[u.id] || isSelf}
                            aria-label={`Remove ${u.fullName ?? u.email}`}
                            title={isSelf ? "Can't delete your own account" : "Remove user"}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed px-1"
                          >
                            {deleting[u.id] ? "…" : "✕"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── SHIFTS TAB ── */}
          {activeTab === "shifts" && (
            <>
              {shiftError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between">
                  <span>{shiftError}</span>
                  <button onClick={() => setShiftError(null)} aria-label="Dismiss error" className="ml-4 text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Shifts define when data entries are expected. A "missed entry" alert fires for each section if no data was entered during a completed shift.
              </p>

              {/* Add new shift */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Add new shift</h3>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="new-shift-name" className="text-xs text-gray-500 font-medium">Shift name</label>
                    <input
                      id="new-shift-name"
                      placeholder="e.g. Morning"
                      value={newShift.name}
                      onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-shift-start" className="text-xs text-gray-500 font-medium">Start time</label>
                    <input
                      id="new-shift-start"
                      type="time"
                      value={newShift.startTime}
                      onChange={e => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-shift-end" className="text-xs text-gray-500 font-medium">End time</label>
                    <input
                      id="new-shift-end"
                      type="time"
                      value={newShift.endTime}
                      onChange={e => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleAddShift}
                    disabled={addingShift}
                    className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {addingShift ? "Adding…" : "+ Add"}
                  </button>
                </div>
              </div>

              {/* Shifts list */}
              {loadingShifts ? (
                <div className="text-sm text-gray-500 py-8 text-center">Loading shifts…</div>
              ) : shifts.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 text-center">No shifts defined yet. Add one above.</div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {shifts.map(s => {
                    const e = shiftEdits[s.id] ?? { name: s.name, startTime: s.startTime, endTime: s.endTime };
                    const dirty = isShiftDirty(s);
                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                        <label htmlFor={`shift-name-${s.id}`} className="sr-only">Shift name</label>
                        <input
                          id={`shift-name-${s.id}`}
                          value={e.name}
                          onChange={ev => setShiftEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], name: ev.target.value } }))}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1">
                          <label htmlFor={`shift-start-${s.id}`} className="text-xs text-gray-500">Start</label>
                          <input
                            id={`shift-start-${s.id}`}
                            type="time"
                            value={e.startTime}
                            onChange={ev => setShiftEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], startTime: ev.target.value } }))}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label htmlFor={`shift-end-${s.id}`} className="text-xs text-gray-500">End</label>
                          <input
                            id={`shift-end-${s.id}`}
                            type="time"
                            value={e.endTime}
                            onChange={ev => setShiftEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], endTime: ev.target.value } }))}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {dirty && (
                          <button
                            onClick={() => saveShift(s)}
                            disabled={savingShift[s.id]}
                            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingShift[s.id] ? "Saving…" : "Save"}
                          </button>
                        )}
                        <button
                          onClick={() => deleteShift(s.id)}
                          disabled={deletingShift[s.id]}
                          aria-label={`Delete shift ${s.name}`}
                          title={`Delete ${s.name} shift`}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 px-1"
                        >
                          {deletingShift[s.id] ? "…" : "✕"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}