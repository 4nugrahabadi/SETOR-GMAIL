import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, store, formatRp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SetorPanel() {
  const userEmail = useAuth((s) => s.user?.email ?? "");
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const accounts = useStore((s) => s.accounts);
  const price = useStore((s) => s.settings.pricePerAccount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !email.toLowerCase().endsWith("@gmail.com")) {
      toast.error("Email harus berupa @gmail.com");
      return;
    }
    if (!password) {
      toast.error("Password wajib diisi");
      return;
    }
    store.submitAccount(email, password);
    setEmail("");
    setPassword("");
    toast.info("Akun masuk antrian — menunggu verifikasi admin (otomatis ~30 detik).");
  };

  return (
    <section className="mx-auto max-w-2xl px-4">
      {/* Hero rules */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-primary/20 bg-[image:var(--gradient-card)] p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Bayaran per akun</span>
        </div>
        <p className="mt-2 font-display text-3xl font-bold">{formatRp(price)} <span className="text-sm font-normal text-muted-foreground">/ akun valid</span></p>
        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Gunakan data sesuai aturan admin — kalau tidak, tidak dibayar.</li>
          <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Email yang double otomatis <b className="text-destructive">GAGAL</b>.</li>
          <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Status berhasil otomatis muncul ~10 detik setelah setor.</li>
        </ul>
      </div>

      {/* Form setor */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-lg font-semibold">Setor Akun Gmail</h2>

        <div className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-xs">Email Gmail</Label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="contoh@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pwd" className="text-xs">Password</Label>
            <div className="relative mt-1">
              <Input
                id="pwd"
                type={showPwd ? "text" : "password"}
                placeholder="Password akun"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="off"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="mt-2 w-full bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95">
            Setor Akun → +{formatRp(price)}
          </Button>
        </div>
      </form>

      {/* Riwayat */}
      <div className="mt-6">
        <h3 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">Riwayat Setor</h3>
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Belum ada akun yang disetor.
          </div>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="animate-slide-up flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleTimeString("id-ID")}
                    {a.reason && ` • ${a.reason}`}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: "processing" | "success" | "failed" }) {
  if (status === "processing") {
    return (
      <span className="animate-pulse-ring flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
        <Loader2 className="h-3 w-3 animate-spin" /> Proses
      </span>
    );
  }
  if (status === "success") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> Berhasil
      </span>
    );
  }
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive")}>
      <XCircle className="h-3 w-3" /> Gagal
    </span>
  );
}
