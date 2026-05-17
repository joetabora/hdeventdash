"use client";

import { Suspense, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Loader2, ShieldCheck, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-harley-black px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_26rem]">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-harley-orange/25 bg-harley-orange/12">
              <Zap className="h-6 w-6 text-harley-orange" />
            </span>
            <span className="text-2xl font-bold text-harley-text">
              Harley Events
            </span>
          </Link>
          <div className="mt-10 max-w-xl">
            <p className="text-xs font-semibold uppercase text-harley-orange">
              Event operations
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-harley-text">
              Plan, track, and recap every dealership event from one command view.
            </h1>
            <div className="mt-8 grid max-w-lg gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-harley-gray/80 bg-harley-dark/70 p-4">
                <CalendarCheck className="h-5 w-5 shrink-0 text-harley-orange" />
                <span className="text-sm text-harley-text-muted">
                  Keep event status, budgets, tasks, and ROI in sync.
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-harley-gray/80 bg-harley-dark/70 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-harley-success" />
                <span className="text-sm text-harley-text-muted">
                  Dealership-scoped access keeps each team in its own lane.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <Zap className="h-8 w-8 text-harley-orange" />
              <span className="text-2xl font-bold text-harley-text">
                Harley Events
              </span>
            </Link>
          </div>

          <Card padding="xl" className="bg-harley-dark/88">
            <p className="text-xs font-semibold uppercase text-harley-orange">
              Welcome back
            </p>
            <h2 className="mt-1 text-xl font-semibold text-harley-text mb-6">
              Sign in to your account
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
            {systemNotice ? (
              <div className="text-sm text-harley-warning bg-harley-warning/10 rounded-lg p-3 border border-harley-warning/30">
                {systemNotice}
              </div>
            ) : null}

            <div>
              <label className="block text-sm text-harley-text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-harley-black/28 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-harley-text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-harley-black/28 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </Button>
            </form>

            <p className="mt-6 text-center text-xs text-harley-text-muted/60">
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
        <div className="min-h-screen flex items-center justify-center bg-harley-black px-4">
          <Loader2 className="w-8 h-8 animate-spin text-harley-orange" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
