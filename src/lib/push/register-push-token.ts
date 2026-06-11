"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isFirebaseConfigured } from "@/lib/firebase/public-config";

export type PushRegisterResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unconfigured"
        | "unsupported"
        | "permission-denied"
        | "no-token"
        | "no-user"
        | "error";
    };

/**
 * Acquire an FCM token for this browser and upsert it to push_tokens.
 * Assumes Notification permission has already been granted (or requests it
 * implicitly via getToken in some browsers).
 */
export async function registerPushToken(): Promise<PushRegisterResult> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey || !isFirebaseConfigured()) {
    return { ok: false, reason: "unconfigured" };
  }

  try {
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.register) {
      return { ok: false, reason: "unsupported" };
    }

    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import(
      "firebase/messaging"
    );

    if (!(await isSupported())) {
      return { ok: false, reason: "unsupported" };
    }

    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    };

    const app = getApps().length ? getApp() : initializeApp(config);
    const messaging = getMessaging(app);

    await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    const token = await getToken(messaging, { vapidKey });
    if (!token) return { ok: false, reason: "no-token" };

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "no-user" };

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: user.id,
        token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;

    return { ok: true };
  } catch (e) {
    console.warn("Push token registration failed:", e);
    return { ok: false, reason: "error" };
  }
}

/** Remove this user's stored push token (stops cron reminders to them). */
export async function unregisterPushToken(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("Push token removal failed:", e);
    return false;
  }
}

/** Whether this user currently has a stored push token. */
export async function hasPushToken(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("push_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch {
    return false;
  }
}
