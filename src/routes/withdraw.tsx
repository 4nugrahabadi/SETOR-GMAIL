import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Wrench, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, store, formatRp, type PaymentMethod } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/withdraw")({
  component: WithdrawPage,
  head: () => ({
    meta: [
      { title: "Penarikan — SetorGmail" },
      { name: "description", content: "Tarik saldo SetorGmail ke Dana, GoPay, atau OVO. Minimal Rp30.000." },
    ],
  }),
});

const METHODS: PaymentMethod[] = ["Dana", "GoPay", "OVO"];

function WithdrawPage() {
  const balance = useStore((s) => s.balance);
  const minWithdraw = useStore((s) => s.settings.minWithdraw);
  const adminFee = useStore((s) => s.settings.adminFee);
  const maintenance = useStore((s) => s.settings.maintenance);
  const withdraws = useStore((s) => s.withdraws);
  useAuth((s) => s.user?.id); // re-render saat auth berubah

  const [method, setMethod] = useState<PaymentMethod>("Dana");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(minWithdraw);

  const total = amount + adminFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < minWithdraw) {
      toast.error(`Minimal penarikan ${formatRp(minWithdraw)}`);
      return;
    }
    if (!/^\d{8,15}$/.test(number)) {
      toast.error("Nomor tidak valid");
      return;
    }
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    const ok = await store.submitWithdraw({
      method,
      number,
      name: name.trim(),
      amount,
    });
    if (ok) {
      toast.success("Penarikan diajukan!");
      setName("");
      setNumber("");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4">
        <AuthGate>
        <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <h1 className="text-center font-display text-2xl font-bold">Ajukan Penarikan</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">Estimasi pencairan 24 jam</p>

        {maintenance ? (
          <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/5 p-8 text-center">
            <Wrench className="mx-auto h-10 w-10 text-warning" />
            <h2 className="mt-3 font-display text-lg font-semibold">Layanan dalam pemeliharaan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fitur penarikan sedang tidak tersedia. Silakan kembali lagi nanti.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
            <div>
              <Label className="text-xs">Metode Pembayaran</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                      method === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="num" className="text-xs">Nomor</Label>
                <Input id="num" inputMode="numeric" placeholder="08xxxxxxxxxx" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="nm" className="text-xs">Nama</Label>
                <Input id="nm" placeholder="Nama pemilik" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
              </div>
            </div>

            <div>
              <Label htmlFor="amt" className="text-xs">Jumlah Ajuan (min. {formatRp(minWithdraw)})</Label>
              <Input id="amt" type="number" min={minWithdraw} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1" required />
            </div>

            <div className="space-y-1.5 rounded-xl bg-secondary/40 p-3 text-sm">
              <Row label="Ajukan" value={formatRp(amount)} />
              <Row label="Biaya Admin" value={formatRp(adminFee)} />
              <Row label="Total dipotong" value={formatRp(total)} bold />
              <div className="my-1.5 border-t border-border/60" />
              <Row label="Diterima" value={formatRp(amount)} accent />
            </div>

            <p className="text-xs text-muted-foreground">
              Saldo Anda: <b className="text-foreground">{formatRp(balance)}</b>
            </p>

            <Button type="submit" disabled={total > balance} className="w-full bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50">
              {total > balance ? "Saldo tidak cukup" : "Ajukan Penarikan"}
            </Button>
          </form>
        )}

        <div className="mt-6">
          <h3 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">Riwayat Penarikan</h3>
          {withdraws.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Belum ada penarikan.
            </div>
          ) : (
            <ul className="space-y-2">
              {withdraws.map((w) => (
                <li key={w.id} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{formatRp(w.amount)} → {w.method}</p>
                      <p className="text-xs text-muted-foreground">{w.number} • {w.name}</p>
                    </div>
                    <WStatus status={w.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </AuthGate>
      </main>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-semibold", accent && "font-bold text-primary")}>{value}</span>
    </div>
  );
}

function WStatus({ status }: { status: "processing" | "success" | "failed" | "rejected" }) {
  if (status === "processing")
    return <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-xs text-accent"><Loader2 className="h-3 w-3 animate-spin" />Menunggu Admin</span>;
  if (status === "success")
    return <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" />Berhasil</span>;
  if (status === "rejected")
    return <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs text-warning"><XCircle className="h-3 w-3" />Ditolak</span>;
  return <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs text-destructive"><XCircle className="h-3 w-3" />Gagal</span>;
}
