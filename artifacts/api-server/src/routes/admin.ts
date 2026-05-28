// artifacts/api-server/src/routes/admin.ts
import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/admin/users — profiles joined with emails from auth.users
router.get("/users", requireRole("admin"), async (_req, res) => {
  try {
    const [profilesResult, authResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, full_name, role, plant_id, created_at")
        .order("full_name"),
      supabase.auth.admin.listUsers(),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (authResult.error) throw authResult.error;

    const emailMap = new Map(
      authResult.data.users.map((u) => [u.id, u.email ?? ""])
    );

    const users = profilesResult.data.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: emailMap.get(p.id) ?? "",
      role: p.role,
      plantId: p.plant_id,
      createdAt: p.created_at,
    }));

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — update role and/or plant (unchanged logic, cleaner error)
router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { role, plantId } = req.body as { role?: string; plantId?: number | null };

  const updates: Record<string, unknown> = {};
  if (role) updates.role = role;
  if (plantId !== undefined) updates.plant_id = plantId;

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/users/:id — deletes from auth (profile cascades)
router.delete("/users/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.auth.admin.deleteUser(id as string);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/admin/invite — sends invite email + pre-creates profile row
router.post("/invite", requireRole("admin"), async (req, res) => {
  const { email, role, plantId } = req.body as {
    email: string;
    role: "admin" | "operator" | "viewer";
    plantId: number | null;
  };

  if (!email || !role) {
    return res.status(400).json({ error: "email and role are required" });
  }

  try {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role, plant_id: plantId },
    });
    if (error) throw error;

    // Pre-create profile so user appears in the list immediately
    await supabase.from("user_profiles").upsert({
      id: data.user.id,
      role,
      plant_id: plantId,
      full_name: null,
    });

    res.json({ success: true, userId: data.user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;