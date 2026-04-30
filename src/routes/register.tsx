import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, User, UserPlus, Phone, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Daftar — SetorGmail" },
      { name: "description", content: "Buat akun SetorGmail gratis dengan username, email, dan password." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/register" });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [refCode, setRefCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.ref) setRefCode(search.ref.toUpperCase());
  }, [search.ref]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await auth.register({ username, email, password, whatsapp, refCode });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Akun ${res.user.username} berhasil dibuat`);
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-[var(--shadow-glow)]">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Daftar Akun Baru</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gratis, langsung bisa setor Gmail</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
          <div>
            <Label htmlFor="un" className="text-xs">Username</Label>
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username_anda" className="pl-9" maxLength={20} required />
            </div>
          </div>
          <div>
            <Label htmlFor="em" className="text-xs">Email</Label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anda@email.com" className="pl-9" required />
            </div>
          </div>
          <div>
            <Label htmlFor="wa" className="text-xs">Nomor WhatsApp aktif</Label>
            <div className="relative mt-1">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="wa" type="tel" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="08123456789" className="pl-9" maxLength={15} required />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Untuk notifikasi status setoran & penarikan via WhatsApp</p>
          </div>
          <div>
            <Label htmlFor="pw" className="text-xs">Password (min. 6 karakter)</Label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="pl-9" minLength={6} required />
            </div>
          </div>
          <div>
            <Label htmlFor="rc" className="text-xs">Kode Referral <span className="text-muted-foreground">(opsional)</span></Label>
            <div className="relative mt-1">
              <Gift className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="rc" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="ABCD1234" className="pl-9 uppercase tracking-wider" maxLength={12} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
            <UserPlus className="h-4 w-4" /> Daftar Sekarang
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
