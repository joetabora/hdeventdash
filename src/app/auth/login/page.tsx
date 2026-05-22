"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, Loader2, ShieldCheck, Zap } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const AUTH_REDIRECT_MESSAGES: Record<string, string> = {
  configuration:
    "Sign-in is not available right now (server configuration). Please try again later or contact support.",
  unavailable:
    "We could not verify your session. Please try again in a moment.",
};

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const systemNotice = useMemo(() => {
    const code = searchParams.get("error");
    if (!code) return "";
    return AUTH_REDIRECT_MESSAGES[code] ?? "";
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="relative z-[1] min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_26rem]">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3 animate-page-in">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-harley-orange/25 bg-harley-orange/12 shadow-[var(--shadow-card)]">
              <Zap className="h-6 w-6 text-harley-orange" aria-hidden />
            </span>
            <span className="font-display-heading text-2xl font-semibold tracking-tight text-harley-text">
              Harley Events
            </span>
          </Link>
          <div className="mt-10 max-w-xl animate-page-in animate-stagger-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-harley-orange">
              Event operations
            </p>
            <h1 className="mt-3 font-display-heading text-4xl font-semibold leading-tight text-harley-text">
              Plan, track, and recap every dealership event from one command view.
            </h1>
            <div className="mt-8 grid max-w-lg gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-overlay/75 p-4 shadow-[var(--shadow-card)]">
                <CalendarCheck className="h-5 w-5 shrink-0 text-harley-orange" aria-hidden />
                <span className="text-sm text-harley-text-muted">
                  Keep status, budgets, tasks, vendors, and ROI signals aligned.
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-overlay/75 p-4 shadow-[var(--shadow-card)]">
                <ShieldCheck className="h-5 w-5 shrink-0 text-harley-success" aria-hidden />
                <span className="text-sm text-harley-text-muted">
                  Dealership-scoped access routes each showroom to the right playbook.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full animate-page-in">
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <Zap className="h-8 w-8 text-harley-orange" aria-hidden />
              <span className="font-display-heading text-2xl font-semibold tracking-tight text-harley-text">
                Harley Events
              </span>
            </Link>
          </div>

          <Card padding="xl" variant="glass" className="bg-surface-overlay/90">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-harley-orange">
              Welcome back
            </p>
            <h2 className="mb-6 mt-2 font-display-heading text-xl font-semibold text-harley-text">
              Sign in to your account
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              {systemNotice ? (
                <div className="rounded-lg border border-harley-warning/30 bg-harley-warning/10 p-3 text-sm text-harley-warning">
                  {systemNotice}
                </div>
              ) : null}

              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />

              {error ? (
                <div className="rounded-lg bg-harley-danger/10 p-3 text-sm text-harley-danger">
                  {error}
                </div>
              ) : null}

              <Button type="submit" size="lg" disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : null}
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-harley-text-muted/65">
              Contact your administrator for account access.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <Loader2 className="h-9 w-9 animate-spin text-harley-orange" aria-hidden />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
