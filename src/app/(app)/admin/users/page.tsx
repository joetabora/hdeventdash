"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAllUserRoles, setUserRole, deleteUserRole, isAdmin } from "@/lib/roles";
import {
  addMemberToCurrentOrganization,
  getCurrentOrganization,
} from "@/lib/organization";
import { Organization, UserRole } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  AlertTriangle,
  Building2,
} from "lucide-react";

interface ManagedUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function UserManagementPage() {
  const supabaseRef = useRef(
    typeof window !== "undefined" ? createClient() : null
  );

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("staff");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);

  const loadUsers = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const adminCheck = await isAdmin(supabase, user.id);
      if (!adminCheck) {
        setAuthorized(false);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      try {
        setCurrentOrganization(await getCurrentOrganization(supabase));
      } catch (orgErr) {
        console.error("Failed to load organization:", orgErr);
        setCurrentOrganization(null);
      }

      const roles = await getAllUserRoles(supabase);

      const { data: memberRows, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id");
      if (membersError) throw membersError;
      const memberIds = new Set(
        (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
      );

      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const merged: ManagedUser[] = [];

      if (authUsers?.users) {
        for (const au of authUsers.users) {
          if (!memberIds.has(au.id)) continue;
          const roleRecord = roles.find((r) => r.user_id === au.id);
          merged.push({
            id: au.id,
            email: au.email || "unknown",
            role: (roleRecord?.role as UserRole) || "staff",
            created_at: au.created_at,
          });
        }
      } else {
        for (const userId of memberIds) {
          const roleRecord = roles.find((r) => r.user_id === userId);
          merged.push({
            id: userId,
            email: userId,
            role: (roleRecord?.role as UserRole) || "staff",
            created_at: roleRecord?.created_at ?? "",
          });
        }
      }

      setUsers(merged);
    } catch (err) {
      console.error("Failed to load users:", err);
      const supabase = supabaseRef.current;
      if (!supabase) return;
      const { data: memberRows } = await supabase
        .from("organization_members")
        .select("user_id");
      const memberIdList = (memberRows ?? []).map(
        (m: { user_id: string }) => m.user_id
      );
      const roles = await getAllUserRoles(supabase);
      setUsers(
        memberIdList.map((userId) => {
          const r = roles.find((x) => x.user_id === userId);
          return {
            id: userId,
            email: userId.slice(0, 8) + "...",
            role: (r?.role as UserRole) ?? "staff",
            created_at: r?.created_at ?? "",
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreateUser() {
    const supabase = supabaseRef.current;
    if (!supabase) return;

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
      const { data, error } = await supabase.auth.admin.createUser({
        email: newEmail.trim(),
        password: newPassword,
        email_confirm: true,
      });

      if (error) {
        if (error.message?.includes("not authorized") || error.message?.includes("not allowed")) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: newEmail.trim(),
            password: newPassword,
          });
          if (signUpError) throw signUpError;
          if (signUpData.user) {
            await addMemberToCurrentOrganization(supabase, signUpData.user.id);
            await setUserRole(supabase, signUpData.user.id, newRole);
          }
        } else {
          throw error;
        }
      } else if (data.user) {
        await addMemberToCurrentOrganization(supabase, data.user.id);
        await setUserRole(supabase, data.user.id, newRole);
      }

      setCreateSuccess(`User "${newEmail}" created as ${newRole}.`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("staff");
      setShowCreate(false);
      loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      await setUserRole(supabase, userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    if (!confirm(`Remove role for "${email}"? This won't delete their auth account.`))
      return;
    try {
      await deleteUserRole(supabase, userId);
      loadUsers();
    } catch (err) {
      console.error("Failed to delete role:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-harley-orange animate-spin" />
      </div>
    );
  }

  if (!authorized) {
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
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-harley-orange" />
          <h1 className="text-2xl font-bold text-harley-text">
            User Management
          </h1>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <UserPlus className="w-4 h-4" />
          Create User
        </Button>
      </div>

      {currentOrganization ? (
        <Card className="border-harley-orange/20 bg-harley-orange/5">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-harley-orange shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-harley-text-muted">
                Your organization
              </p>
              <p className="text-lg font-semibold text-harley-text">
                {currentOrganization.name}
              </p>
              <p className="text-xs text-harley-text-muted font-mono break-all">
                ID: {currentOrganization.id}
              </p>
              <p className="text-sm text-harley-text-muted pt-1">
                Everyone on this page belongs to this organization. Events,
                files, and roles are isolated from other organizations.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-harley-danger/40 bg-harley-danger/10 px-4 py-3 text-sm text-harley-text">
          <AlertTriangle className="w-5 h-5 text-harley-danger shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-harley-danger">
              No organization linked to your account
            </p>
            <p className="text-harley-text-muted mt-1">
              Run the organizations migration in Supabase and ensure your user
              has a row in{" "}
              <code className="text-xs bg-harley-gray-light/40 px-1 rounded">
                organization_members
              </code>
              . Until then, creating users or assigning roles may fail.
            </p>
          </div>
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <Card className="animate-fade-in-up">
          <h3 className="font-semibold text-harley-text mb-1">
            Create New User
          </h3>
          {currentOrganization && (
            <p className="text-sm text-harley-text-muted mb-4">
              They will be invited to{" "}
              <span className="font-medium text-harley-text">
                {currentOrganization.name}
              </span>{" "}
              with the permission level you choose below.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-harley-text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs text-harley-text-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm placeholder-harley-text-muted/60 focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-xs text-harley-text-muted mb-1.5">
                Permission in this organization
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
              >
                <option value="staff">
                  Staff — use events and files (this org only)
                </option>
                <option value="admin">
                  Admin — manage users and roles for this org
                </option>
              </select>
              <p className="text-[11px] text-harley-text-muted/80 mt-1.5 leading-snug">
                Organization is fixed to yours; you are not choosing a separate
                &quot;tenant&quot; here. To host another company, use another
                Supabase project or add org-switching later.
              </p>
            </div>
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
              <tr className="border-b border-harley-gray">
                <th className="text-left px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  Permission
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-harley-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-harley-gray/50">
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
                    className="hover:bg-harley-gray-light/15 transition-colors"
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
                        className="px-2.5 py-1 rounded-md bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-xs focus:outline-none focus:border-harley-orange/70 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user.role === "admin" ? (
                        <Badge variant="orange" className="ml-2">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Admin
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

      <p className="text-xs text-harley-text-muted/50 text-center max-w-2xl mx-auto">
        Users are created in Supabase Auth, added to your organization, and
        assigned Admin or Staff in{" "}
        <code className="text-[10px] bg-harley-gray-light/30 px-1 rounded">
          user_roles
        </code>{" "}
        for this organization only.
      </p>
    </div>
  );
}
