"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
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
    <div className="min-h-screen flex items-center justify-center bg-harley-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Zap className="w-8 h-8 text-harley-orange" />
            <span className="text-2xl font-bold text-harley-text">
              Harley Events
            </span>
          </Link>
        </div>

        <Card padding="xl">
          <h2 className="text-xl font-semibold text-harley-text mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-harley-text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
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
                className="w-full px-4 py-2.5 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
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

          <p className="mt-6 text-center text-xs text-harley-text-muted/50">
            Contact your administrator for account access.
          </p>
        </Card>
      </div>
    </div>
  );
}
