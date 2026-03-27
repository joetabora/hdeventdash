"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isFirebaseConfigured } from "@/lib/firebase/public-config";
import { Bell, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "harley-push-banner-dismissed-v1";

export function PushNotificationPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const onMessageRegistered = useRef(false);

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  const syncToken = useCallback(async () => {
    if (!vapidKey || !isFirebaseConfigured()) return;

    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const { getMessaging, getToken, isSupported, onMessage } = await import(
      "firebase/messaging"
    );

    if (!(await isSupported())) return;

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
    if (!token) return;

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("push_tokens").upsert(
      {
        user_id: user.id,
        token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (!onMessageRegistered.current) {
      onMessageRegistered.current = true;
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "Harley Event Dashboard";
        const body = payload.notification?.body ?? "";
        if (
          Notification.permission === "granted" &&
          document.visibilityState === "visible"
        ) {
          try {
            new Notification(title, { body, icon: "/favicon.ico" });
          } catch {
            /* ignore */
          }
        }
      });
    }
  }, [vapidKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isFirebaseConfigured() || !vapidKey) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const perm = Notification.permission;
    if (perm === "granted") {
      void syncToken();
      return;
    }
    if (perm === "denied") return;
    setShowBanner(true);
  }, [syncToken, vapidKey]);

  async function enableNotifications() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowBanner(false);
        return;
      }
      await syncToken();
      setShowBanner(false);
    } catch (e) {
      console.error("Push setup failed:", e);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShowBanner(false);
  }

  if (!isFirebaseConfigured() || !vapidKey) return null;
  if (!showBanner) return null;

  return (
    <div className="shrink-0 border-b border-harley-orange/25 bg-harley-orange/10 px-4 py-3">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Bell className="w-5 h-5 text-harley-orange shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-harley-text">
              Get event reminders
            </p>
            <p className="text-xs text-harley-text-muted mt-0.5">
              3-day and 1-day alerts, plus at-risk warnings for incomplete
              checklists.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={enableNotifications}
            className="min-h-10"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Allow notifications
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-harley-text-muted hover:bg-harley-gray-light/40 hover:text-harley-text transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
