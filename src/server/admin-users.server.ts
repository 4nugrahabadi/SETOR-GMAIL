import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function runAdminListUsers(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!roles || roles.length === 0) throw new Error("Admin only");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, email, balance, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return {
    users: (data ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      balance: u.balance,
      createdAt: new Date(u.created_at).getTime(),
    })),
  };
}

async function ensureAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!roles || roles.length === 0) throw new Error("Admin only");
}

async function attachProfiles<T extends { user_id: string }>(rows: T[]) {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, username: null as string | null, user_email: null as string | null }));
  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("id, username, email").in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = map.get(r.user_id);
    return { ...r, username: p?.username ?? null, user_email: p?.email ?? null };
  });
}

export async function runAdminListAccounts(userId: string) {
  await ensureAdmin(userId);
  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, email, password, status, reason, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { accounts: await attachProfiles(data ?? []) };
}

export async function runAdminListWithdraws(userId: string) {
  await ensureAdmin(userId);
  const { data, error } = await supabaseAdmin
    .from("withdraws")
    .select("id, user_id, method, number, name, amount, fee, total, status, reason, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { withdraws: await attachProfiles(data ?? []) };
}