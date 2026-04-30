import { Link } from "@tanstack/react-router";
import { Lock, LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);

  if (loading) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        <p className="mt-2 text-sm">Memuat sesi…</p>
      </section>
    );
  }

  if (user) return <>{children}</>;

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-border/60 bg-[image:var(--gradient-card)] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold">Masuk untuk lanjut</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Anda perlu masuk atau mendaftar terlebih dulu untuk menggunakan fitur setor Gmail dan penarikan saldo.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-95">
            <LogIn className="h-4 w-4" /> Masuk
          </Link>
          <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:border-primary/50">
            <UserPlus className="h-4 w-4" /> Daftar
          </Link>
        </div>
      </div>
    </section>
  );
}
