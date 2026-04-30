import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Wrench, Save, CheckCircle2, XCircle, Loader2, Users, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore, store, formatRp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { adminListUsers, adminListAccounts, adminListWithdraws } from "@/server/admin-users.functions";
import { callAuthed } from "@/lib/server-fn-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Pengaturan Admin — SetorGmail" }],
  }),
});

function AdminPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const isAdmin = useAuth((s) => s.isAdmin);
  const loading = useAuth((s) => s.loading);
  const settings = useStore((s) => s.settings);
  const balance = useStore((s) => s.balance);
  const accounts = useStore((s) => s.accounts);
  const withdraws = useStore((s) => s.withdraws);

  const [validPassword, setValidPassword] = useState(settings.validPassword);
  const [pricePerAccount, setPricePerAccount] = useState(settings.pricePerAccount);
  const [minWithdraw, setMinWithdraw] = useState(settings.minWithdraw);
  const [adminFee, setAdminFee] = useState(settings.adminFee);

  useEffect(() => {
    setValidPassword(settings.validPassword);
    setPricePerAccount(settings.pricePerAccount);
    setMinWithdraw(settings.minWithdraw);
    setAdminFee(settings.adminFee);
  }, [settings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-lg font-bold">Perlu masuk</h1>
          <p className="mt-1 text-xs text-muted-foreground">Anda harus login sebagai admin untuk mengakses halaman ini.</p>
          <Button onClick={() => navigate({ to: "/login" })} className="mt-4 w-full">Masuk</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-3 font-display text-lg font-bold">Akses ditolak</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Akun @{user.username} bukan admin. Hubungi pemilik aplikasi untuk dipromosikan.
          </p>
          <Link to="/" className="mt-4 inline-block text-xs text-primary hover:underline">← Kembali ke beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-12">
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <h1 className="font-display text-2xl font-bold">Pengaturan Admin</h1>
      <p className="text-xs text-muted-foreground">Login sebagai @{user.username} • role: admin</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Saldo Saya" value={formatRp(balance)} />
        <Stat label="Akun" value={String(accounts.length)} />
        <Stat label="Penarikan" value={String(withdraws.length)} />
      </div>

      <section className="mt-5 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><Wrench className="h-4 w-4 text-warning" /> Mode Pemeliharaan</h2>
            <p className="mt-1 text-xs text-muted-foreground">Saat aktif, halaman penarikan tidak bisa digunakan.</p>
          </div>
          <Switch
            checked={settings.maintenance}
            onCheckedChange={async (v) => {
              await store.updateSettings({ maintenance: v });
              toast.success(v ? "Maintenance AKTIF" : "Maintenance NONAKTIF");
            }}
          />
        </div>
      </section>

      <AccountAdminPanel />
      <WithdrawAdminPanel />
      <UsersAdminPanel />

      <section className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-semibold">Konfigurasi</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Password setor valid</Label>
            <Input value={validPassword} onChange={(e) => setValidPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Harga / akun (Rp)</Label>
            <Input type="number" value={pricePerAccount} onChange={(e) => setPricePerAccount(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Min. withdraw (Rp)</Label>
            <Input type="number" value={minWithdraw} onChange={(e) => setMinWithdraw(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Biaya admin (Rp)</Label>
            <Input type="number" value={adminFee} onChange={(e) => setAdminFee(Number(e.target.value))} className="mt-1" />
          </div>
        </div>

        <Button
          onClick={async () => {
            await store.updateSettings({ validPassword, pricePerAccount, minWithdraw, adminFee });
            toast.success("Konfigurasi disimpan");
          }}
          className="mt-2 w-full"
        >
          <Save className="mr-1.5 h-4 w-4" /> Simpan Perubahan
        </Button>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

interface AdminWithdraw {
  id: string;
  user_id: string;
  method: string;
  number: string;
  name: string;
  amount: number;
  fee: number;
  total: number;
  status: "processing" | "success" | "failed";
  reason: string | null;
  created_at: string;
  username: string | null;
  user_email: string | null;
}

function WithdrawAdminPanel() {
  const [withdraws, setWithdraws] = useState<AdminWithdraw[]>([]);
  const [filter, setFilter] = useState<"processing" | "all">("processing");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callAuthed(adminListWithdraws);
      setWithdraws(res.withdraws as AdminWithdraw[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memuat penarikan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const list = filter === "processing"
    ? withdraws.filter((w) => w.status === "processing")
    : withdraws;

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Kelola Penarikan</h2>
        <div className="flex gap-1 rounded-lg bg-secondary/40 p-0.5 text-xs">
          <button onClick={() => setFilter("processing")} className={`rounded-md px-2 py-1 ${filter === "processing" ? "bg-card font-semibold" : "text-muted-foreground"}`}>
            Menunggu
          </button>
          <button onClick={() => setFilter("all")} className={`rounded-md px-2 py-1 ${filter === "all" ? "bg-card font-semibold" : "text-muted-foreground"}`}>
            Semua
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {filter === "processing" ? "Tidak ada penarikan menunggu." : "Belum ada penarikan."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((w) => (
            <li key={w.id} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{formatRp(w.amount)} <span className="text-muted-foreground">→ {w.method}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{w.number} • {w.name}</p>
                  <p className="truncate text-[10px] text-primary/90">
                    @{w.username ?? "?"} <span className="text-muted-foreground">• {w.user_email ?? "—"}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Total dipotong: {formatRp(w.total)} • {new Date(w.created_at).toLocaleString("id-ID")}</p>
                </div>
                <AdminWStatus status={w.status} />
              </div>

              {w.status === "processing" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={async () => { await store.approveWithdraw(w.id); toast.success("Penarikan disetujui"); load(); }} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Setujui
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    const reason = prompt("Alasan gagal (opsional):") ?? undefined;
                    await store.failWithdraw(w.id, reason || undefined);
                    toast.success("Ditandai gagal, saldo dikembalikan");
                    load();
                  }}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Gagal
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminWStatus({ status }: { status: "processing" | "success" | "failed" }) {
  if (status === "processing")
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent"><Loader2 className="h-3 w-3 animate-spin" />Proses</span>;
  if (status === "success")
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success"><CheckCircle2 className="h-3 w-3" />Berhasil</span>;
  return <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive"><XCircle className="h-3 w-3" />Gagal</span>;
}

interface AdminAccount {
  id: string;
  user_id: string;
  email: string;
  password: string | null;
  status: "processing" | "success" | "failed";
  reason: string | null;
  created_at: string;
  username: string | null;
  user_email: string | null;
}

function AccountAdminPanel() {
  const price = useStore((s) => s.settings.pricePerAccount);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [filter, setFilter] = useState<"processing" | "all">("processing");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await callAuthed(adminListAccounts);
      setAccounts(res.accounts as AdminAccount[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memuat setoran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const list = filter === "processing"
    ? accounts.filter((a) => a.status === "processing")
    : accounts;

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-primary" /> Kelola Akun Setor
        </h2>
        <div className="flex gap-1 rounded-lg bg-secondary/40 p-0.5 text-xs">
          <button onClick={() => setFilter("processing")} className={`rounded-md px-2 py-1 ${filter === "processing" ? "bg-card font-semibold" : "text-muted-foreground"}`}>
            Menunggu
          </button>
          <button onClick={() => setFilter("all")} className={`rounded-md px-2 py-1 ${filter === "all" ? "bg-card font-semibold" : "text-muted-foreground"}`}>
            Semua
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Semua setoran diproses manual. Klik <b>Berhasil</b> untuk menambah saldo user, atau <b>Gagal</b> untuk menolak.
      </p>

      {loading ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {filter === "processing" ? "Tidak ada akun menunggu." : "Belum ada akun setor."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((a) => (
            <li key={a.id} className="rounded-xl border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.email}</p>
                  <p className="truncate text-[10px] text-primary/90">
                    @{a.username ?? "?"} <span className="text-muted-foreground">• {a.user_email ?? "—"}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("id-ID")}
                    {a.reason && ` • ${a.reason}`}
                  </p>
                  {a.password && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Password:</span>
                      <code className="rounded bg-background/60 px-1.5 py-0.5 text-[11px] font-mono">
                        {revealed[a.id] ? a.password : "••••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => setRevealed((r) => ({ ...r, [a.id]: !r[a.id] }))}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {revealed[a.id] ? "Sembunyikan" : "Lihat"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(a.password ?? ""); toast.success("Password disalin"); }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Salin
                      </button>
                    </div>
                  )}
                </div>
                <AdminAStatus status={a.status} />
              </div>

              {a.status === "processing" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={async () => { await store.approveAccount(a.id); toast.success("Akun disetujui — saldo user bertambah"); load(); }} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Berhasil (+{formatRp(price)})
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    const reason = prompt("Alasan gagal (opsional):") ?? undefined;
                    await store.failAccount(a.id, reason || undefined);
                    toast.success("Akun ditandai gagal");
                    load();
                  }}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Gagal
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminAStatus({ status }: { status: "processing" | "success" | "failed" }) {
  if (status === "processing")
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent"><Loader2 className="h-3 w-3 animate-spin" />Proses</span>;
  if (status === "success")
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success"><CheckCircle2 className="h-3 w-3" />Berhasil</span>;
  return <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive"><XCircle className="h-3 w-3" />Gagal</span>;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  createdAt: number;
}

function UsersAdminPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callAuthed(adminListUsers);
      setUsers(res.users);
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Users className="h-4 w-4 text-primary" /> Data Pengguna
        <span className="ml-auto rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {users?.length ?? 0} terdaftar
        </span>
      </h2>

      {loading && <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {users && users.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Belum ada pengguna terdaftar.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {(users ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">@{u.username}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{formatRp(u.balance)}</p>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
