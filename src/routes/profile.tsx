import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCircle2, Mail, Wallet, History, ArrowLeft, ShieldCheck, LogOut, Phone, Save } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useStore, formatRp } from "@/lib/store";
import { auth, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil — SetorGmail" },
      { name: "description", content: "Informasi akun pengguna SetorGmail: saldo, riwayat setor, dan riwayat penarikan." },
      { property: "og:title", content: "Profil — SetorGmail" },
      { property: "og:description", content: "Lihat info akun, saldo, dan riwayat aktivitas Anda." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const balance = useStore((s) => s.balance);
  const accounts = useStore((s) => s.accounts);
  const withdraws = useStore((s) => s.withdraws);
  const user = useAuth((s) => s.user);

  const [whatsapp, setWhatsapp] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waInitial, setWaInitial] = useState("");

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setWaLoading(true);
    supabase
      .from("profiles")
      .select("whatsapp")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const v = (data?.whatsapp as string | null) ?? "";
        setWhatsapp(v);
        setWaInitial(v);
        setWaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveWhatsapp = async () => {
    if (!user) return;
    const raw = whatsapp.trim();
    const digits = raw.replace(/\D/g, "");
    let norm = digits;
    if (norm.startsWith("0")) norm = "62" + norm.slice(1);
    else if (norm.startsWith("8")) norm = "62" + norm;
    if (!/^62\d{8,13}$/.test(norm)) {
      toast.error("Nomor WhatsApp tidak valid (contoh: 08123456789)");
      return;
    }
    setWaSaving(true);
    const { error } = await supabase.from("profiles").update({ whatsapp: norm }).eq("id", user.id);
    setWaSaving(false);
    if (error) {
      toast.error("Gagal menyimpan nomor WhatsApp");
      return;
    }
    setWhatsapp(norm);
    setWaInitial(norm);
    toast.success("Nomor WhatsApp tersimpan");
  };

  const handleLogout = async () => {
    await auth.logout();
    toast.success("Anda telah keluar");
    navigate({ to: "/login" });
  };

  const successAccounts = accounts.filter((a) => a.status === "success").length;
  const totalWithdrawn = withdraws
    .filter((w) => w.status === "success")
    .reduce((sum, w) => sum + w.amount, 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Profil Card */}
        <section className="rounded-2xl border border-border/60 bg-[image:var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[var(--shadow-glow)]">
              <UserCircle2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold">@{user.username}</h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <ShieldCheck className="h-3 w-3" />
                Terverifikasi
              </span>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda akan keluar dari akun @{user.username}. Data akun & riwayat tetap tersimpan dan bisa diakses kembali setelah login.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ya, keluar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        {/* Nomor WhatsApp */}
        <section className="mt-4 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Nomor WhatsApp</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Notifikasi status setoran & penarikan akan dikirim ke nomor ini.
          </p>
          <Label htmlFor="wa-edit" className="text-xs">Nomor aktif</Label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wa-edit"
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={waLoading ? "Memuat…" : "08123456789"}
                className="pl-9"
                maxLength={15}
                disabled={waLoading}
              />
            </div>
            <Button
              onClick={handleSaveWhatsapp}
              disabled={waLoading || waSaving || whatsapp.trim() === waInitial.trim()}
              className="bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              {waSaving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
          {!waLoading && !waInitial && (
            <p className="mt-2 text-[11px] text-accent">
              Belum ada nomor — isi sekarang agar menerima notifikasi WhatsApp.
            </p>
          )}
        </section>

        {/* Stats */}
        <section className="mt-4 grid grid-cols-3 gap-3">
          <StatCard icon={<Wallet className="h-4 w-4" />} label="Saldo" value={formatRp(balance)} />
          <StatCard icon={<Mail className="h-4 w-4" />} label="Akun Sukses" value={successAccounts.toString()} />
          <StatCard icon={<History className="h-4 w-4" />} label="Total Tarik" value={formatRp(totalWithdrawn)} />
        </section>

        {/* Riwayat Setor */}
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Riwayat Setor</h2>
          <div className="space-y-2">
            {accounts.length === 0 && (
              <p className="rounded-xl border border-border/60 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada riwayat setor
              </p>
            )}
            {accounts.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.email}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <span
                  className={
                    "ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (a.status === "success"
                      ? "bg-success/10 text-success"
                      : a.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/10 text-accent")
                  }
                >
                  {a.status === "success" ? "Berhasil" : a.status === "failed" ? "Gagal" : "Diproses"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Riwayat Tarik */}
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Riwayat Penarikan</h2>
          <div className="space-y-2">
            {withdraws.length === 0 && (
              <p className="rounded-xl border border-border/60 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Belum ada penarikan
              </p>
            )}
            {withdraws.slice(0, 10).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{w.method} • {w.number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <div className="ml-2 text-right">
                  <p className="text-sm font-semibold">{formatRp(w.amount)}</p>
                  <span
                    className={
                      "text-[11px] font-medium " +
                      (w.status === "success"
                        ? "text-success"
                        : w.status === "failed"
                          ? "text-destructive"
                          : "text-accent")
                    }
                  >
                    {w.status === "success" ? "Berhasil" : w.status === "failed" ? "Gagal" : "Diproses"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 truncate font-display text-base font-bold">{value}</p>
    </div>
  );
}
