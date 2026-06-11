"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Building2, KeyRound, Loader2, User } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isFirebaseConfigured } from "@/lib/firebase/public-config";
import {
  hasPushToken,
  registerPushToken,
  unregisterPushToken,
} from "@/lib/push/register-push-token";
import { apiFetchJson } from "@/lib/api/api-fetch-json";
import { errorMessage, showError, showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import type { Organization, UserRole } from "@/types/database";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 font-display-heading text-base font-semibold text-harley-text">
        <Icon className="h-4 w-4 text-harley-orange" />
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-harley-text-muted">{description}</p>
    </div>
  );
}

export function SettingsClient({
  userEmail,
  role,
  organization,
}: {
  userEmail: string | null;
  role: UserRole | null;
  organization: Organization | null;
}) {
  const router = useRouter();
  const isAdminUser = role === "admin";

  // --- Password ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (savingPassword) return;
    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password updated.");
    } catch (err) {
      showError(errorMessage(err, "Failed to update password."));
    } finally {
      setSavingPassword(false);
    }
  }

  // --- Push notifications ---
  const pushConfigured = isFirebaseConfigured();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushConfigured) return;
    void hasPushToken().then(setPushEnabled);
  }, [pushConfigured]);

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      if (
        typeof Notification !== "undefined" &&
        typeof Notification.requestPermission === "function"
      ) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          showError(
            "Notifications are blocked for this site. Allow them in your browser settings and try again."
          );
          return;
        }
      }
      const result = await registerPushToken();
      if (result.ok) {
        setPushEnabled(true);
        showSuccess("Event reminders enabled on this device.");
      } else {
        showError(
          result.reason === "unsupported"
            ? "This browser does not support push notifications."
            : "Could not enable notifications. Try again."
        );
      }
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    try {
      const ok = await unregisterPushToken();
      if (ok) {
        setPushEnabled(false);
        showSuccess("Event reminders disabled.");
      } else {
        showError("Could not disable notifications.");
      }
    } finally {
      setPushBusy(false);
    }
  }

  // --- Organization (admin) ---
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [artFormUrl, setArtFormUrl] = useState(
    organization?.marketing_art_form_url ?? ""
  );
  const [savingOrg, setSavingOrg] = useState(false);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (savingOrg) return;
    const trimmedName = orgName.trim();
    if (!trimmedName) {
      showError("Dealership name cannot be empty.");
      return;
    }
    setSavingOrg(true);
    try {
      await apiFetchJson("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          marketing_art_form_url: artFormUrl.trim(),
        }),
      });
      showSuccess("Organization settings saved.");
      router.refresh();
    } catch (err) {
      showError(errorMessage(err, "Failed to save organization settings."));
    } finally {
      setSavingOrg(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        kicker="Preferences"
        title="Settings"
        description="Your account, notifications, and dealership configuration."
      />

      <Card padding="md">
        <SectionTitle
          icon={User}
          title="Account"
          description="Who you are signed in as."
        />
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-harley-text-muted">Email</span>
            <span className="font-medium text-harley-text">
              {userEmail ?? "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-harley-text-muted">Role</span>
            <Badge variant="default">
              {role ? ROLE_LABELS[role] ?? role : "No role assigned"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-harley-text-muted">Dealership</span>
            <span className="font-medium text-harley-text">
              {organization?.name ?? "—"}
            </span>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <SectionTitle
          icon={KeyRound}
          title="Change password"
          description="At least 8 characters. You stay signed in after changing it."
        />
        <form onSubmit={handleChangePassword} className="space-y-3">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="md">
        <SectionTitle
          icon={Bell}
          title="Event reminders"
          description="Push notifications: 3-day and 1-day alerts plus at-risk checklist warnings, sent to this device."
        />
        {!pushConfigured ? (
          <p className="text-sm text-harley-text-muted">
            Push notifications are not configured for this deployment.
          </p>
        ) : pushEnabled === null ? (
          <div className="flex items-center gap-2 text-sm text-harley-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking status…
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-harley-text-muted">
              Reminders are{" "}
              <span
                className={`font-semibold ${
                  pushEnabled ? "text-harley-success" : "text-harley-text"
                }`}
              >
                {pushEnabled ? "enabled" : "disabled"}
              </span>{" "}
              for your account.
            </p>
            {pushEnabled ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDisablePush}
                disabled={pushBusy}
              >
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
                Disable
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleEnablePush}
                disabled={pushBusy}
              >
                {pushBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Enable on this device
              </Button>
            )}
          </div>
        )}
      </Card>

      {isAdminUser && organization ? (
        <Card padding="md">
          <SectionTitle
            icon={Building2}
            title="Dealership settings"
            description="Org-wide defaults. Visible to every member of this dealership."
          />
          <form onSubmit={handleSaveOrg} className="space-y-3">
            <Input
              label="Dealership name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              maxLength={200}
              required
            />
            <Input
              label="Default art request / SPM form URL"
              type="url"
              placeholder="https://…"
              value={artFormUrl}
              onChange={(e) => setArtFormUrl(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-harley-text-muted">
              Used as the default art request link in event marketing. Each
              event can still override it.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingOrg}>
                {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save dealership settings
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
