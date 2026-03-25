"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push("/auth/login"), 2000);
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

        <div className="bg-harley-dark rounded-xl p-8 border border-harley-gray">
          <h2 className="text-xl font-semibold text-harley-text mb-6">
            Create your account
          </h2>

          {success ? (
            <div className="text-harley-success bg-harley-success/10 rounded-lg p-4 text-center">
              <p className="font-semibold">Account created!</p>
              <p className="text-sm mt-1">Redirecting to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm text-harley-text-muted mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text placeholder-harley-text-muted focus:outline-none focus:border-harley-orange transition-colors"
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
                  className="w-full px-4 py-2.5 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text placeholder-harley-text-muted focus:outline-none focus:border-harley-orange transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm text-harley-text-muted mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text placeholder-harley-text-muted focus:outline-none focus:border-harley-orange transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-harley-orange text-white font-semibold rounded-lg hover:bg-harley-orange-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-harley-text-muted">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-harley-orange hover:text-harley-orange-light"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
