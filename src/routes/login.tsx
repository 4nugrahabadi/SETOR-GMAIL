import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — SetorGmail" },
      { name: "description", content: "Masuk ke akun SetorGmail untuk setor Gmail dan menarik saldo." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [emailOrUsername, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await auth.login({ emailOrUsername, password });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Selamat datang, ${res.user.username}!`);
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-[var(--shadow-glow)]">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Masuk SetorGmail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mulai setor & menarik saldo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
          <div>
            <Label htmlFor="id" className="text-xs">Email atau Username</Label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="id" value={emailOrUsername} onChange={(e) => setId(e.target.value)} placeholder="anda@email.com" className="pl-9" required />
            </div>
          </div>
          <div>
            <Label htmlFor="pwd" className="text-xs">Password</Label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="pl-9" required />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
            <LogIn className="h-4 w-4" /> Masuk
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
