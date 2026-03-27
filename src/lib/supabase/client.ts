import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function getEnvOrThrow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and add your Supabase credentials."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

function createFreshBrowserClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getEnvOrThrow();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** Single shared instance for real browser sessions (tabs share one client). */
let browserSingleton: SupabaseClient | null = null;

/**
 * Supabase browser client for `"use client"` code.
 *
 * In the browser: returns one shared singleton so components and hooks do not
 * each construct a new client.
 *
 * During SSR / React server rendering: returns a new client per call so
 * request-scoped work never shares auth state across users.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createFreshBrowserClient();
  }
  if (!browserSingleton) {
    browserSingleton = createFreshBrowserClient();
  }
  return browserSingleton;
}

