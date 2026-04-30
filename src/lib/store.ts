// Supabase-backed store. API publik (store.*, useStore, formatRp) dipertahankan.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/auth";
import { processAccountSubmission, adminApproveAccount, adminFailAccount, adminApproveWithdraw, adminFailWithdraw, notifyWithdrawSubmission } from "@/server/account-actions.functions";
import { callAuthed } from "@/lib/server-fn-auth";

export type AccountStatus = "processing" | "success" | "failed";
export type WithdrawStatus = "processing" | "success" | "failed";
export type PaymentMethod = "Dana" | "GoPay" | "OVO";

export interface AccountEntry {
  id: string;
  userId?: string;
  username?: string;
  email: string;
  password: string;
  status: AccountStatus;
  reason?: string;
  createdAt: number;
}

export interface WithdrawEntry {
  id: string;
  userId?: string;
  username?: string;
  method: PaymentMethod;
  number: string;
  name: string;
  amount: number;
  fee: number;
  total: number;
  status: WithdrawStatus;
  createdAt: number;
}

export interface NotifEntry {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  variant: "success" | "error" | "info";
}

export interface AppSettings {
  validPassword: string;
  pricePerAccount: number;
  minWithdraw: number;
  adminFee: number;
  maintenance: boolean;
}

export interface AppState {
  balance: number;
  accounts: AccountEntry[];
  withdraws: WithdrawEntry[];
  notifs: NotifEntry[];
  settings: AppSettings;
  loading: boolean;
}

const defaultSettings: AppSettings = {
  validPassword: "",
  pricePerAccount: 4000,
  minWithdraw: 30000,
  adminFee: 1000,
  maintenance: false,
};

let state: AppState = {
  balance: 0,
  accounts: [],
  withdraws: [],
  notifs: [],
  settings: defaultSettings,
  loading: true,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setState(patch: Partial<AppState>) { state = { ...state, ...patch }; emit(); }

let currentUserId: string | null = null;
let currentIsAdmin = false;
let channels: Array<{ unsubscribe: () => void }> = [];

function unsubAll() {
  channels.forEach((c) => c.unsubscribe());
  channels = [];
}

// Mappers DB -> UI
function mapAccount(row: any): AccountEntry {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    password: "", // password kolom tidak pernah dibaca dari client (security)
    status: row.status,
    reason: row.reason ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}
function mapWithdraw(row: any): WithdrawEntry {
  return {
    id: row.id,
    userId: row.user_id,
    method: row.method,
    number: row.number,
    name: row.name,
    amount: row.amount,
    fee: row.fee,
    total: row.total,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  };
}
function mapNotif(row: any): NotifEntry {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    read: row.read,
    variant: row.variant,
    createdAt: new Date(row.created_at).getTime(),
  };
}
function mapSettings(row: any): AppSettings {
  return {
    validPassword: row.valid_password,
    pricePerAccount: row.price_per_account,
    minWithdraw: row.min_withdraw,
    adminFee: row.admin_fee,
    maintenance: row.maintenance,
  };
}

async function reloadAll(userId: string, isAdmin: boolean) {
  const accountsQuery = isAdmin
    ? supabase.from("accounts").select("id,user_id,email,status,reason,created_at,resolved_at").order("created_at", { ascending: false })
    : supabase.from("accounts").select("id,user_id,email,status,reason,created_at,resolved_at").eq("user_id", userId).order("created_at", { ascending: false });
  const withdrawsQuery = isAdmin
    ? supabase.from("withdraws").select("*").order("created_at", { ascending: false })
    : supabase.from("withdraws").select("*").eq("user_id", userId).order("created_at", { ascending: false });

  const [profileR, accountsR, withdrawsR, notifsR, settingsR] = await Promise.all([
    supabase.from("profiles").select("balance").eq("id", userId).maybeSingle(),
    accountsQuery,
    withdrawsQuery,
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  setState({
    balance: profileR.data?.balance ?? 0,
    accounts: (accountsR.data ?? []).map(mapAccount),
    withdraws: (withdrawsR.data ?? []).map(mapWithdraw),
    notifs: (notifsR.data ?? []).map(mapNotif),
    settings: settingsR.data ? mapSettings(settingsR.data) : defaultSettings,
    loading: false,
  });
}

async function refetchBalance(userId: string) {
  const { data } = await supabase.from("profiles").select("balance").eq("id", userId).maybeSingle();
  if (data) setState({ balance: data.balance ?? 0 });
}

function subscribeRealtime(userId: string, isAdmin: boolean) {
  unsubAll();

  const accountsCh = supabase
    .channel("rt-accounts-" + userId)
    .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, async () => {
      const q = isAdmin
        ? supabase.from("accounts").select("id,user_id,email,status,reason,created_at,resolved_at").order("created_at", { ascending: false })
        : supabase.from("accounts").select("id,user_id,email,status,reason,created_at,resolved_at").eq("user_id", userId).order("created_at", { ascending: false });
      const { data } = await q;
      setState({ accounts: (data ?? []).map(mapAccount) });
      refetchBalance(userId);
    })
    .subscribe();
  channels.push({ unsubscribe: () => supabase.removeChannel(accountsCh) });

  const withdrawsCh = supabase
    .channel("rt-withdraws-" + userId)
    .on("postgres_changes", { event: "*", schema: "public", table: "withdraws" }, async () => {
      const q = isAdmin
        ? supabase.from("withdraws").select("*").order("created_at", { ascending: false })
        : supabase.from("withdraws").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const { data } = await q;
      setState({ withdraws: (data ?? []).map(mapWithdraw) });
      refetchBalance(userId);
    })
    .subscribe();
  channels.push({ unsubscribe: () => supabase.removeChannel(withdrawsCh) });

  const notifCh = supabase
    .channel("rt-notif-" + userId)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, async () => {
      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(50);
      setState({ notifs: (data ?? []).map(mapNotif) });
    })
    .subscribe();
  channels.push({ unsubscribe: () => supabase.removeChannel(notifCh) });

  const settingsCh = supabase
    .channel("rt-settings")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_settings" }, (payload: any) => {
      setState({ settings: mapSettings(payload.new) });
    })
    .subscribe();
  channels.push({ unsubscribe: () => supabase.removeChannel(settingsCh) });
}

// React ke perubahan auth
if (typeof window !== "undefined") {
  auth.subscribe(() => {
    const a = auth.get();
    const newUserId = a.user?.id ?? null;
    const newIsAdmin = a.isAdmin;
    if (newUserId !== currentUserId || newIsAdmin !== currentIsAdmin) {
      currentUserId = newUserId;
      currentIsAdmin = newIsAdmin;
      if (newUserId) {
        reloadAll(newUserId, newIsAdmin);
        subscribeRealtime(newUserId, newIsAdmin);
      } else {
        unsubAll();
        setState({ balance: 0, accounts: [], withdraws: [], notifs: [], loading: false });
      }
    }
  });
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async pushNotif(n: { title: string; body: string; variant: "success" | "error" | "info" }) {
    if (!currentUserId) return;
    await supabase.from("notifications").insert({
      user_id: currentUserId,
      title: n.title,
      body: n.body,
      variant: n.variant,
    });
  },

  async markAllNotifRead() {
    if (!currentUserId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("read", false);
  },

  async clearNotifs() {
    if (!currentUserId) return;
    await supabase.from("notifications").delete().eq("user_id", currentUserId);
    setState({ notifs: [] });
  },

  async submitAccount(email: string, password: string) {
    if (!currentUserId) return;
    const trimmedEmail = email.trim().toLowerCase();
    // Insert (status default processing)
    const { data, error } = await supabase
      .from("accounts")
      .insert({ user_id: currentUserId, email: trimmedEmail, password })
      .select()
      .single();
    if (error || !data) {
      await store.pushNotif({ title: "Gagal menyetor", body: error?.message ?? "Tidak dapat menyimpan akun.", variant: "error" });
      return;
    }
    // Server-side: cek double / password salah / schedule auto-success 30 detik
    try {
      await callAuthed(processAccountSubmission, { data: { accountId: data.id } });
    } catch (e) {
      console.error("processAccountSubmission failed", e);
    }
  },

  async approveAccount(id: string) {
    try { await callAuthed(adminApproveAccount, { data: { accountId: id } }); }
    catch (e: any) { await store.pushNotif({ title: "Gagal", body: e?.message ?? "Tidak dapat menyetujui.", variant: "error" }); }
  },

  async failAccount(id: string, reason?: string) {
    try { await callAuthed(adminFailAccount, { data: { accountId: id, reason } }); }
    catch (e: any) { await store.pushNotif({ title: "Gagal", body: e?.message ?? "Tidak dapat menandai gagal.", variant: "error" }); }
  },

  async submitWithdraw(input: { method: PaymentMethod; number: string; name: string; amount: number }): Promise<boolean> {
    if (!currentUserId) return false;
    const fee = state.settings.adminFee;
    const total = input.amount + fee;
    if (total > state.balance) {
      await store.pushNotif({
        title: "Saldo tidak cukup",
        body: `Butuh ${formatRp(total)}, saldo Anda ${formatRp(state.balance)}.`,
        variant: "error",
      });
      return false;
    }
    // Potong saldo dulu
    const { error: balErr } = await supabase
      .from("profiles")
      .update({ balance: state.balance - total })
      .eq("id", currentUserId);
    if (balErr) {
      await store.pushNotif({ title: "Gagal", body: balErr.message, variant: "error" });
      return false;
    }
    const { data: wRow, error } = await supabase.from("withdraws").insert({
      user_id: currentUserId,
      method: input.method,
      number: input.number,
      name: input.name,
      amount: input.amount,
      fee,
      total,
    }).select("id").single();
    if (error) {
      // Rollback saldo
      await supabase.from("profiles").update({ balance: state.balance }).eq("id", currentUserId);
      await store.pushNotif({ title: "Gagal", body: error.message, variant: "error" });
      return false;
    }
    await store.pushNotif({
      title: "Penarikan diajukan",
      body: `${formatRp(input.amount)} ke ${input.method} ${input.number}. Menunggu admin.`,
      variant: "info",
    });
    // Notif admin via WhatsApp (Fonnte)
    if (wRow?.id) {
      try {
        await callAuthed(notifyWithdrawSubmission, { data: { withdrawId: wRow.id } });
      } catch (e) {
        console.error("notifyWithdrawSubmission failed", e);
      }
    }
    return true;
  },

  async approveWithdraw(id: string) {
    try { await callAuthed(adminApproveWithdraw, { data: { withdrawId: id } }); }
    catch (e: any) { await store.pushNotif({ title: "Gagal", body: e?.message ?? "Tidak dapat menyetujui.", variant: "error" }); }
  },

  async failWithdraw(id: string, reason?: string) {
    try { await callAuthed(adminFailWithdraw, { data: { withdrawId: id, reason } }); }
    catch (e: any) { await store.pushNotif({ title: "Gagal", body: e?.message ?? "Tidak dapat menandai gagal.", variant: "error" }); }
  },

  async updateSettings(patch: Partial<AppSettings>) {
    const dbPatch: any = {};
    if (patch.validPassword !== undefined) dbPatch.valid_password = patch.validPassword;
    if (patch.pricePerAccount !== undefined) dbPatch.price_per_account = patch.pricePerAccount;
    if (patch.minWithdraw !== undefined) dbPatch.min_withdraw = patch.minWithdraw;
    if (patch.adminFee !== undefined) dbPatch.admin_fee = patch.adminFee;
    if (patch.maintenance !== undefined) dbPatch.maintenance = patch.maintenance;
    const { error } = await supabase.from("app_settings").update(dbPatch).eq("id", 1);
    if (error) {
      await store.pushNotif({ title: "Gagal simpan", body: error.message, variant: "error" });
    }
  },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function formatRp(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}
