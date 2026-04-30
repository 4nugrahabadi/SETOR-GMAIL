import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, Copy, Share2, Users, Coins, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/AppHeader";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatRp } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Referral — SetorGmail" },
      { name: "description", content: "Ajak teman dan dapatkan bonus Rp500 untuk setiap pendaftaran via link referral Anda." },
    ],
  }),
  component: ReferralPage,
});

const SHARE_BASE = "https://setorgmail.lovable.app";

function ReferralPage() {
  return (
    <div className="min-h-screen pb-12">
      <AppHeader />
      <main className="pt-2">
        <AuthGate>
          <ReferralContent />
        </AuthGate>
      </main>
    </div>
  );
}

function ReferralContent() {
  const userId = useAuth((s) => s.user?.id ?? null);
  const [code, setCode] = useState<string>("");
  const [stats, setStats] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: rewards }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
        (supabase.from("referral_rewards" as any).select("amount").eq("referrer_id", userId)) as any,
      ]);
      if (cancelled) return;
      setCode((profile as any)?.referral_code ?? "");
      const list: Array<{ amount: number }> = (rewards as any) ?? [];
      setStats({
        count: list.length,
        total: list.reduce((s, r) => s + (r.amount ?? 0), 0),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const link = code ? `${SHARE_BASE}/register?ref=${code}` : SHARE_BASE;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} disalin`);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const share = async () => {
    const shareData = {
      title: "SetorGmail",
      text: `Daftar SetorGmail dan kita sama-sama untung! Pakai kode referral saya: ${code}`,
      url: link,
    };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(shareData); return; } catch { /* ignored */ }
    }
    copy(link, "Link");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali
      </Link>

      <div className="rounded-2xl border border-border/60 bg-[image:var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-[var(--shadow-glow)]">
            <Gift className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">Program Referral</h1>
            <p className="text-xs text-muted-foreground">Ajak teman, dapat <span className="font-semibold text-primary">Rp500</span> per pendaftaran.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Teman bergabung</div>
          <p className="mt-1 font-display text-2xl font-bold">{loading ? "—" : stats.count}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Coins className="h-3.5 w-3.5" /> Total bonus</div>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{loading ? "—" : formatRp(stats.total)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Kode referral Anda</p>
          <div className="mt-1.5 flex gap-2">
            <Input value={code || "…"} readOnly className="font-mono text-base font-semibold tracking-[0.2em]" />
            <Button type="button" variant="secondary" size="icon" onClick={() => copy(code, "Kode")} disabled={!code} aria-label="Salin kode">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Link undangan</p>
          <div className="mt-1.5 flex gap-2">
            <Input value={link} readOnly className="text-xs" />
            <Button type="button" variant="secondary" size="icon" onClick={() => copy(link, "Link")} aria-label="Salin link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={share}
            className="mt-3 w-full bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Share2 className="h-4 w-4" /> Bagikan Sekarang
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-semibold text-sm">Cara kerja</h2>
        <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
          <li><span className="font-semibold text-foreground">1.</span> Bagikan link atau kode referral Anda ke teman.</li>
          <li><span className="font-semibold text-foreground">2.</span> Teman mendaftar lewat link tersebut (kode terisi otomatis).</li>
          <li><span className="font-semibold text-foreground">3.</span> Saldo Anda otomatis bertambah <span className="font-semibold text-primary">Rp500</span> begitu pendaftaran sukses.</li>
        </ol>
      </div>
    </div>
  );
}
