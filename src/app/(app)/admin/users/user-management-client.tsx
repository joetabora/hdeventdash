"use client";

import { useState } from "react";
import type { ManagedUserDto } from "@/lib/admin/managed-users";
import {
  apiFetchJson,
  apiFetchJsonOrNull,
  isApiError,
} from "@/lib/api/api-fetch-json";
import { UserRole } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select, baseInputClassName } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  Loader2,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { showError } from "@/lib/toast";

type AdminUsersPayload = {
  users: ManagedUserDto[];
  currentUserId: string;
};

async function fetchManagedUsers(): Promise<AdminUsersPayload | null> {
  return apiFetchJsonOrNull<AdminUsersPayload>("/api/admin/users");
}

export function UserManagementClient({
  initialAuthorized,
  initialUsers,
  initialCurrentUserId,
}: {
  initialAuthorized: boolean;
  initialUsers: ManagedUserDto[];
  initialCurrentUserId: string | null;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [currentUserId, setCurrentUserId] = useState(
    initialCurrentUserId ?? ""
  );

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("staff");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  async function handleCreateUser() {
    setCreateError("");
    setCreateSuccess("");

    if (!newEmail.trim() || !newPassword.trim()) {
      setCreateError("Email and password are required.");
      return;
    }
    if (newPassword.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setCreating(true);
    try {
      await apiFetchJson("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      setCreateSuccess(`User "${newEmail}" created as ${newRole}.`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("staff");
      setShowCreate(false);
      const fresh = await fetchManagedUsers();
      if (fresh) {
        setUsers(fresh.users);
        setCurrentUserId(fresh.currentUserId);
      }
    } catch (err: unknown) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to create user";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await apiFetchJson(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setUsers((old) =>
        old.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error(
        "Failed to update role:",
        isApiError(err) ? err.message : err
      );
      showError("Failed to update user role.");
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Remove role for "${email}"? This won't delete their auth account.`))
      return;
    try {
      await apiFetchJson(`/api/admin/users/${userId}/role`, {
        method: "DELETE",
      });
      const fresh = await fetchManagedUsers();
      if (fresh) {
        setUsers(fresh.users);
        setCurrentUserId(fresh.currentUserId);
      }
    } catch (err) {
      console.error(
        "Failed to delete role:",
        isApiError(err) ? err.message : err
      );
      showError("Failed to remove user.");
    }
  }

  if (!initialAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-harley-danger" />
        <h2 className="text-xl font-bold text-harley-text">Access Denied</h2>
        <p className="text-sm text-harley-text-muted">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        kicker="Administrators"
        title="User management"
        description="Provision accounts, delegate roles, and keep Supabase-aligned access in sync."
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <UserPlus className="h-4 w-4" />
            Create user
          </Button>
        }
      />

      {/* Create user form */}
      {showCreate && (
        <Card className="animate-fade-in-up">
          <h3 className="font-semibold text-harley-text mb-4">
            Create New User
          </h3>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              type="email"
              label="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
            />
            <Input
              type="password"
              label="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
            <Select
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              options={[
                { value: "staff", label: "Staff" },
                { value: "manager", label: "Manager" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </div>

          {createError && (
            <div className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3 mb-4">
              {createError}
            </div>
          )}
          {createSuccess && (
            <div className="text-harley-success text-sm bg-harley-success/10 rounded-lg p-3 mb-4">
              {createSuccess}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Create User
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                setCreateError("");
                setCreateSuccess("");
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Users list */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-base/40">
                <th className="text-left px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  Role
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/72">
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-sm text-harley-text-muted"
                  >
                    No users found. Create the first user above.
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-surface-overlay/55"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-harley-orange/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-harley-orange">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-harley-text">
                            {user.email}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] text-harley-text-muted">
                              (you)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        disabled={isSelf}
                        className={cn(
                          baseInputClassName,
                          "px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user.role === "admin" ? (
                        <Badge variant="orange" className="ml-2">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : user.role === "manager" ? (
                        <Badge variant="muted" className="ml-2">
                          <Briefcase className="w-3 h-3 mr-1" />
                          Manager
                        </Badge>
                      ) : (
                        <Badge variant="default" className="ml-2">
                          <Shield className="w-3 h-3 mr-1" />
                          Staff
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-harley-text-muted/50 text-center">
        New accounts are provisioned through Supabase Auth (service role).
        Email and profile metadata are mirrored in <code className="text-[10px]">app_users</code> for
        org-scoped queries. Roles live in <code className="text-[10px]">user_roles</code> and are
        updated via authenticated admin API routes.
      </p>
    </div>
  );
}
