import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { MessageCircle, Phone, Clock, Send, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Jam operasional: Senin-Sabtu 08:00-20:00 WIB (UTC+7)
function getCSStatus() {
  const now = new Date();
  // konversi ke WIB (UTC+7) tanpa bergantung pada timezone perangkat
  const wib = new Date(now.getTime() + (now.getTimezoneOffset() + 7 * 60) * 60000);
  const day = wib.getDay(); // 0=Min, 1=Sen, ..., 6=Sab
  const hour = wib.getHours();
  const isWeekday = day >= 1 && day <= 6; // Senin-Sabtu
  const inHours = hour >= 8 && hour < 20;
  return { online: isWeekday && inHours, wib };
}

export const Route = createFileRoute("/cs")({
  head: () => ({
    meta: [
      { title: "Customer Service - SetorGmail" },
      { name: "description", content: "Hubungi Customer Service SetorGmail melalui Telegram atau Admin. Jam operasional Senin-Sabtu 08:00-20:00 WIB." },
    ],
  }),
  component: CSPage,
});

const TELEGRAM = "@Anugr4h4badi";
const ADMIN_PHONE = "+62 898-0558-429";

function CSPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [status, setStatus] = useState(() => getCSStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(getCSStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success(`${label} disalin`);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pt-2">
        <section className="rounded-3xl border border-border/60 bg-[image:var(--gradient-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Customer Service</h1>
                <p className="text-sm text-muted-foreground">Tim kami siap membantu Anda</p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                status.online
                  ? "border-success/30 bg-success/15 text-success"
                  : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "relative flex h-2 w-2",
                )}
              >
                {status.online && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    status.online ? "bg-success" : "bg-muted-foreground",
                  )}
                />
              </span>
              {status.online ? "Online" : "Offline"}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {/* Telegram CS */}
            <a
              href={`https://t.me/${TELEGRAM.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/40 hover:bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/15 text-[#229ED9]">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Telegram CS</p>
                  <p className="font-semibold">{TELEGRAM}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); copy("Telegram CS", TELEGRAM); }}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Salin Telegram"
              >
                {copied === "Telegram CS" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </a>

            {/* Admin */}
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
                  <p className="font-semibold">{ADMIN_PHONE}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy("Admin", ADMIN_PHONE)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Salin nomor admin"
              >
                {copied === "Admin" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Jam operasional */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Jam Operasional</p>
                  <p className="font-semibold">Senin – Sabtu</p>
                  <p className="text-sm text-muted-foreground">08:00 – 20:00 WIB</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Di luar jam operasional, pesan akan dibalas pada hari kerja berikutnya.
          </p>
        </section>
      </main>
    </div>
  );
}
