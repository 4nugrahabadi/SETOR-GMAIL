import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Wallet, Mail, UserCircle2, LogIn, Headphones, Gift } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStore, store, formatRp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const notifs = useStore((s) => s.notifs);
  const balance = useStore((s) => s.balance);
  const location = useLocation();
  const unread = notifs.filter((n) => !n.read).length;
  const [openNotif, setOpenNotif] = useState(false);
  const isLoggedIn = useAuth((s) => !!s.user);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-2xl grid-cols-3 items-center px-4 py-3">
        {isLoggedIn ? (
          <div className="flex items-center gap-1 justify-self-start">
            <Link
              to="/profile"
              className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Profil"
            >
              <UserCircle2 className="h-7 w-7" />
            </Link>
            <Link
              to="/referral"
              className={cn(
                "relative inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20",
                location.pathname === "/referral" && "bg-primary/20",
              )}
              aria-label="Referral"
            >
              <Gift className="h-3.5 w-3.5" /> Referral
            </Link>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 justify-self-start rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
            aria-label="Masuk"
          >
            <LogIn className="h-3.5 w-3.5" /> Masuk
          </Link>
        )}

        <Link to="/" className="flex items-center justify-center gap-2 justify-self-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-[var(--shadow-glow)]">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">SetorGmail</span>
        </Link>

        <div className="flex items-center gap-1 justify-self-end">
        <Link
          to="/cs"
          className={cn(
            "rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground",
            location.pathname === "/cs" && "bg-secondary text-foreground",
          )}
          aria-label="Customer Service"
        >
          <Headphones className="h-5 w-5" />
        </Link>
        <Popover open={openNotif} onOpenChange={(o) => { setOpenNotif(o); if (o) store.markAllNotifRead(); }}>
          <PopoverTrigger asChild>
            <button className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Notifikasi">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 border-border bg-card p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold">Notifikasi</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => store.clearNotifs()}>
                Bersihkan
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada notifikasi</p>
              )}
              {notifs.map((n) => (
                <div key={n.id} className="border-b border-border/50 px-4 py-3 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.variant === "success" && "bg-success",
                        n.variant === "error" && "bg-destructive",
                        n.variant === "info" && "bg-accent",
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {/* Balance + nav tarik */}
      <div className="mx-auto max-w-2xl px-4 pb-4">
        <Link
          to="/withdraw"
          className={cn(
            "group flex items-center justify-between rounded-2xl border border-border/60 bg-[image:var(--gradient-card)] p-4 shadow-[var(--shadow-card)] transition hover:border-primary/40",
            location.pathname === "/withdraw" && "border-primary/60",
          )}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo Anda</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{formatRp(balance)}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition group-hover:scale-105">
            <Wallet className="h-4 w-4" />
            Tarik
          </div>
        </Link>
      </div>
    </header>
  );
}
