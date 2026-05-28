// src/components/AdminModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Role = "admin" | "operator" | "viewer";

interface AdminUser {
  id: string;
  fullName: string | null;
  email: string;
  role: Role;
  plantId: number | null;
  createdAt: string;
}

const PLANTS = [{ id: 1, name: "Plant A" }];
const ROLES: Role[] = ["admin", "operator", "viewer"];

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

  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // inline edit state — keyed by user id
  const [edits, setEdits] = useState<Record<string, { role: Role; plantId: number | null }>>({});
  const [saving, setSaving]   = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState<Role>("operator");
  const [invitePlant, setInvitePlant] = useState<number | null>(1);
  const [inviting, setInviting]       = useState(false);
  const [inviteDone, setInviteDone]   = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Load users whenever modal opens
  useEffect(() => {
    if (open) {
      loadUsers();
      setInviteDone(false);
      setError(null);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
      // seed edit state from current values
      const initialEdits: typeof edits = {};
      data.forEach(u => {
        initialEdits[u.id] = { role: u.role, plantId: u.plantId };
      });
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

  function isDirty(user: AdminUser) {
    const e = edits[user.id];
    if (!e) return false;
    return e.role !== user.role || e.plantId !== user.plantId;
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
    if (id === user?.id) {
      setError("You cannot delete your own account.");
      return;
    }
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
            <h2 className="text-base font-semibold text-gray-900">User Management</h2>
            <p className="text-xs text-gray-400 mt-0.5">Invite users · manage roles · assign plants</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* ── Invite form ── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Invite new user</h3>

            {inviteDone && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
                Invite sent! The user will receive an email to set their password.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as Role)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <select
                value={invitePlant ?? ""}
                onChange={e => setInvitePlant(e.target.value ? Number(e.target.value) : null)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No plant</option>
                {PLANTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>

          {/* ── Users table ── */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              All users {!loadingUsers && <span className="text-gray-400 font-normal">({users.length})</span>}
            </h3>

            {loadingUsers ? (
              <div className="text-sm text-gray-400 py-8 text-center">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">No users found.</div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {users.map(u => {
                  const e = edits[u.id] ?? { role: u.role, plantId: u.plantId };
                  const dirty = isDirty(u);
                  const isSelf = u.id === user?.id;

                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">

                      {/* Identity */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {u.fullName ?? <span className="text-gray-400 italic">Pending</span>}
                          {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>

                      {/* Current role pill (shown when not dirty) */}
                      {!dirty && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_PILL[u.role]}`}>
                          {u.role}
                        </span>
                      )}

                      {/* Role select */}
                      <select
                        value={e.role}
                        disabled={isSelf}
                        onChange={ev => patchEdit(u.id, { role: ev.target.value as Role })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>

                      {/* Plant select */}
                      <select
                        value={e.plantId ?? ""}
                        onChange={ev => patchEdit(u.id, { plantId: ev.target.value ? Number(ev.target.value) : null })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No plant</option>
                        {PLANTS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      {/* Save — only shows when dirty */}
                      {dirty && (
                        <button
                          onClick={() => saveUser(u)}
                          disabled={saving[u.id]}
                          className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving[u.id] ? "Saving…" : "Save"}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={deleting[u.id] || isSelf}
                        title={isSelf ? "Can't delete your own account" : "Remove user"}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      >
                        {deleting[u.id] ? "…" : "✕"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}