// Supabase-backed auth. API publik dipertahankan agar route lama tetap jalan.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { awardReferralBonus } from "@/server/referral.functions";

export interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

let state: AuthState = { user: null, loading: true, isAdmin: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

async function loadProfileAndRole(userId: string): Promise<{ user: User | null; isAdmin: boolean }> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, username, email").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  return {
    user: profile ? { id: profile.id, username: profile.username, email: profile.email } : null,
    isAdmin,
  };
}

// Init: setup auth listener BEFORE getSession (rekomendasi Supabase)
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      // Defer DB calls untuk menghindari deadlock di dalam callback
      setTimeout(async () => {
        const { user, isAdmin } = await loadProfileAndRole(session.user.id);
        setState({ user, isAdmin, loading: false });
      }, 0);
    } else {
      setState({ user: null, isAdmin: false, loading: false });
    }
  });

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      const { user, isAdmin } = await loadProfileAndRole(session.user.id);
      setState({ user, isAdmin, loading: false });
    } else {
      setState({ loading: false });
    }
  });
}

export const auth = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  currentUser(): User | null {
    return state.user;
  },

  isLoggedIn(): boolean {
    return !!state.user;
  },

  async register(input: { username: string; email: string; password: string; whatsapp: string; refCode?: string }):
    Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const whatsapp = input.whatsapp.trim();
    const refCode = (input.refCode ?? "").trim().toUpperCase();

    if (username.length < 3) return { ok: false, error: "Username minimal 3 karakter" };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { ok: false, error: "Username hanya huruf, angka, underscore" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Format email tidak valid" };
    if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter" };
    // Normalisasi WA → digit-only diawali 62. Terima 08xx, 8xx, +62xx, 62xx.
    const waDigits = whatsapp.replace(/\D/g, "");
    let waNorm = waDigits;
    if (waNorm.startsWith("0")) waNorm = "62" + waNorm.slice(1);
    else if (waNorm.startsWith("8")) waNorm = "62" + waNorm;
    if (!/^62\d{8,13}$/.test(waNorm)) return { ok: false, error: "Nomor WhatsApp tidak valid (contoh: 08123456789)" };

    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { username, whatsapp: waNorm, ref_code: refCode || undefined },
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Gagal membuat akun" };

    // Beri bonus referral ke pengundang (jika ada). Aman dari double-credit (UNIQUE).
    if (refCode) {
      try { await awardReferralBonus({ data: { newUserId: data.user.id } }); }
      catch (e) { console.error("awardReferralBonus failed", e); }
    }

    return { ok: true, user: { id: data.user.id, username, email } };
  },

  async login(input: { emailOrUsername: string; password: string }):
    Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    let email = input.emailOrUsername.trim().toLowerCase();

    // Jika input bukan email, lookup email dari username
    if (!email.includes("@")) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .ilike("username", email)
        .maybeSingle();
      if (!data) return { ok: false, error: "Username tidak ditemukan" };
      email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Gagal masuk" };

    const { user } = await loadProfileAndRole(data.user.id);
    return user ? { ok: true, user } : { ok: false, error: "Profil tidak ditemukan" };
  },

  async logout() {
    await supabase.auth.signOut();
    setState({ user: null, isAdmin: false });
  },
};

export function useAuth<T>(selector: (s: AuthState) => T): T {
  return useSyncExternalStore(
    auth.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
