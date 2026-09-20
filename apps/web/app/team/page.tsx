"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  Crown,
  Edit3,
  History,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";

import {
  createRole,
  deleteRole,
  getAuditLogs,
  getMembers,
  getPermissions,
  getRoles,
  updateMemberRole,
  updateMemberStatus,
  updateRole,
  type AuditLog,
  type PermissionEffect,
  type WorkspaceMember,
  type WorkspacePermission,
  type WorkspaceRole,
} from "@/lib/api/members";

type Tab =
  | "members"
  | "roles"
  | "permissions"
  | "audit";

const tabs: {
  id: Tab;
  label: string;
  icon: typeof Users;
}[] = [
  {
    id: "members",
    label: "Members",
    icon: Users,
  },
  {
    id: "roles",
    label: "Roles",
    icon: Shield,
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: Activity,
  },
  {
    id: "audit",
    label: "Audit log",
    icon: History,
  },
];

const roleColors: Record<
  string,
  string
> = {
  Owner:
    "bg-amber-50 text-amber-700 border-amber-200",
  Admin:
    "bg-violet-50 text-violet-700 border-violet-200",
  "Team Lead":
    "bg-blue-50 text-blue-700 border-blue-200",
  "Team Member":
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Client:
    "bg-slate-100 text-slate-700 border-slate-200",
};

const avatarGradients = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

function getAvatarGradient(
  name: string,
) {
  const index =
    name
      .split("")
      .reduce(
        (sum, char) =>
          sum + char.charCodeAt(0),
        0,
      ) %
    avatarGradients.length;

  return avatarGradients[index];
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U"
  );
}

function getRoleColor(role: string) {
  return (
    roleColors[role] ||
    "bg-slate-100 text-slate-700 border-slate-200"
  );
}

export default function TeamPage() {
  const { hasPermission, authorization } =
    useAuth();

  const { showToast } = useToast();

  const canViewMembers =
    hasPermission("members.view");

  const canUpdateMembers =
    hasPermission("members.update");

  const canSuspendMembers =
    hasPermission("members.suspend");

  const canViewRoles =
    hasPermission("roles.view");

  const canCreateRoles =
    hasPermission("roles.create");

  const canUpdateRoles =
    hasPermission("roles.update");

  const canDeleteRoles =
    hasPermission("roles.delete");

  const canViewPermissions =
    hasPermission("permissions.view");

  const canViewAudit =
    hasPermission("audit.view");

  const [activeTab, setActiveTab] =
    useState<Tab | null>(null);

  const [members, setMembers] =
    useState<WorkspaceMember[]>([]);

  const [roles, setRoles] =
    useState<WorkspaceRole[]>([]);

  const [permissions, setPermissions] =
    useState<WorkspacePermission[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selectedMember, setSelectedMember] =
    useState<WorkspaceMember | null>(
      null,
    );

  const [selectedRole, setSelectedRole] =
    useState<WorkspaceRole | null>(null);

  const [showRoleModal, setShowRoleModal] =
    useState(false);

  const [roleName, setRoleName] =
    useState("");

  const [roleDescription, setRoleDescription] =
    useState("");

  const [selectedPermissionIds, setSelectedPermissionIds] =
    useState<number[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [openMemberMenu, setOpenMemberMenu] =
    useState<number | null>(null);

  const [permissionSearch, setPermissionSearch] =
    useState("");

  useEffect(() => {
    if (canViewMembers) {
      setActiveTab("members");
    } else if (canViewRoles) {
      setActiveTab("roles");
    } else if (canViewPermissions) {
      setActiveTab("permissions");
    } else if (canViewAudit) {
      setActiveTab("audit");
    } else {
      setActiveTab(null);
    }
  }, [
    canViewMembers,
    canViewRoles,
    canViewPermissions,
    canViewAudit,
  ]);

  const loadData = async (
    showRefresh = false,
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requests: Promise<unknown>[] = [];

      if (canViewMembers) {
        requests.push(
          getMembers().then(
            (response) => {
              if (
                response.success &&
                response.data
              ) {
                setMembers(
                  response.data,
                );
              }
            },
          ),
        );
      }

      if (canViewRoles) {
        requests.push(
          getRoles().then(
            (response) => {
              if (
                response.success &&
                response.data
              ) {
                setRoles(
                  response.data,
                );
              }
            },
          ),
        );
      }

      if (canViewPermissions) {
        requests.push(
          getPermissions().then(
            (response) => {
              if (
                response.success &&
                response.data
              ) {
                setPermissions(
                  response.data,
                );
              }
            },
          ),
        );
      }

      if (canViewAudit) {
        requests.push(
          getAuditLogs().then(
            (response) => {
              if (
                response.success &&
                response.data
              ) {
                setAuditLogs(
                  response.data,
                );
              }
            },
          ),
        );
      }

      await Promise.all(requests);
    } catch (error) {
      console.error(
        "Failed to load team data:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load team data.",
        "error",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (
      canViewMembers ||
      canViewRoles ||
      canViewPermissions ||
      canViewAudit
    ) {
      loadData();
    } else {
      setLoading(false);
    }
    // Permission state is established by AuthContext.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canViewMembers,
    canViewRoles,
    canViewPermissions,
    canViewAudit,
  ]);

  const filteredMembers =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return members.filter(
        (member) => {
          const matchesSearch =
            !normalizedSearch ||
            member.user.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            member.user.email
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesRole =
            roleFilter === "all" ||
            member.role.name ===
              roleFilter;

          const matchesStatus =
            statusFilter === "all" ||
            member.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        },
      );
    }, [
      members,
      search,
      roleFilter,
      statusFilter,
    ]);

  const filteredPermissions =
    useMemo(() => {
      const query =
        permissionSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return permissions;
      }

      return permissions.filter(
        (permission) =>
          permission.name
            .toLowerCase()
            .includes(query) ||
          permission.key
            .toLowerCase()
            .includes(query) ||
          permission.category
            .toLowerCase()
            .includes(query),
      );
    }, [
      permissions,
      permissionSearch,
    ]);

  const permissionGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          WorkspacePermission[]
        >();

      filteredPermissions.forEach(
        (permission) => {
          const category =
            permission.category ||
            "Other";

          const existing =
            groups.get(category) ||
            [];

          existing.push(permission);

          groups.set(
            category,
            existing,
          );
        },
      );

      return Array.from(
        groups.entries(),
      );
    }, [filteredPermissions]);

  const activeMembers =
    members.filter(
      (member) =>
        member.status === "Active",
    ).length;

  const suspendedMembers =
    members.filter(
      (member) =>
        member.status ===
        "Suspended",
    ).length;

  const systemRoles =
    roles.filter(
      (role) => role.isSystem,
    ).length;

  const customRoles =
    roles.filter(
      (role) => !role.isSystem,
    ).length;

  const openCreateRole = () => {
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissionIds([]);
    setShowRoleModal(true);
  };

  const openEditRole = (
    role: WorkspaceRole,
  ) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(
      role.description,
    );

    setSelectedPermissionIds(
      role.rolePermissions
        .filter(
          (entry) =>
            entry.effect === "Allow",
        )
        .map(
          (entry) =>
            entry.permissionId,
        ),
    );

    setShowRoleModal(true);
  };

  const togglePermission = (
    permissionId: number,
  ) => {
    setSelectedPermissionIds(
      (current) =>
        current.includes(permissionId)
          ? current.filter(
              (id) =>
                id !== permissionId,
            )
          : [
              ...current,
              permissionId,
            ],
    );
  };

  const handleSaveRole = async () => {
    const trimmedName =
      roleName.trim();

    if (trimmedName.length < 2) {
      showToast(
        "Role name must contain at least 2 characters.",
        "error",
      );
      return;
    }

    try {
      setSaving(true);

      if (selectedRole) {
        if (!canUpdateRoles) {
          showToast(
            "You do not have permission to update roles.",
            "error",
          );
          return;
        }

        const response =
          await updateRole(
            selectedRole.id,
            {
              name: trimmedName,
              description:
                roleDescription.trim(),
              permissionIds:
                selectedPermissionIds,
            },
          );

        if (
          !response.success ||
          !response.data
        ) {
          throw new Error(
            response.message ||
              "Failed to update role.",
          );
        }

        showToast(
          "Role updated successfully.",
          "success",
        );
      } else {
        if (!canCreateRoles) {
          showToast(
            "You do not have permission to create roles.",
            "error",
          );
          return;
        }

        const response =
          await createRole({
            name: trimmedName,
            description:
              roleDescription.trim(),
            permissionIds:
              selectedPermissionIds,
          });

        if (
          !response.success ||
          !response.data
        ) {
          throw new Error(
            response.message ||
              "Failed to create role.",
          );
        }

        showToast(
          "Custom role created successfully.",
          "success",
        );
      }

      setShowRoleModal(false);
      await loadData(true);
    } catch (error) {
      console.error(
        "Failed to save role:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save role.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (
    role: WorkspaceRole,
  ) => {
    if (!canDeleteRoles) {
      showToast(
        "You do not have permission to delete roles.",
        "error",
      );
      return;
    }

    if (role.isSystem) {
      showToast(
        "System roles cannot be deleted.",
        "error",
      );
      return;
    }

    if (role._count.members > 0) {
      showToast(
        "This role is still assigned to members.",
        "error",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete the "${role.name}" role? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const response =
        await deleteRole(
          role.id,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to delete role.",
        );
      }

      showToast(
        "Role deleted successfully.",
        "success",
      );

      await loadData(true);
    } catch (error) {
      console.error(
        "Failed to delete role:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete role.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (
    member: WorkspaceMember,
    roleId: number,
  ) => {
    if (!canUpdateMembers) {
      showToast(
        "You do not have permission to change member roles.",
        "error",
      );
      return;
    }

    try {
      const response =
        await updateMemberRole(
          member.id,
          roleId,
        );

      if (
        !response.success ||
        !response.data
      ) {
        throw new Error(
          response.message ||
            "Failed to update member role.",
        );
      }

      showToast(
        "Member role updated successfully.",
        "success",
      );

      setOpenMemberMenu(null);

      await loadData(true);
    } catch (error) {
      console.error(
        "Failed to update member role:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update member role.",
        "error",
      );
    }
  };

  const handleStatusChange = async (
    member: WorkspaceMember,
    status:
      | "Active"
      | "Suspended",
  ) => {
    if (!canSuspendMembers) {
      showToast(
        "You do not have permission to suspend or restore members.",
        "error",
      );
      return;
    }

    try {
      const response =
        await updateMemberStatus(
          member.id,
          status,
        );

      if (
        !response.success ||
        !response.data
      ) {
        throw new Error(
          response.message ||
            "Failed to update member status.",
        );
      }

      showToast(
        status === "Suspended"
          ? "Member suspended successfully."
          : "Member restored successfully.",
        "success",
      );

      setOpenMemberMenu(null);

      await loadData(true);
    } catch (error) {
      console.error(
        "Failed to update member status:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update member status.",
        "error",
      );
    }
  };

  const hasAnyTeamPermission =
    canViewMembers ||
    canViewRoles ||
    canViewPermissions ||
    canViewAudit;

  if (!hasAnyTeamPermission) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
          <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Shield className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Team administration restricted
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your workspace role does not currently have access to team administration.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-fuchsia-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                  <Users className="h-3.5 w-3.5" />
                  Workspace administration
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Team & Access
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
                  Manage workspace members, roles, permissions and security activity from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadData(true)
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-xl transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {/* Stats */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Total members
                  </span>

                  <Users className="h-4 w-4 text-white/60" />
                </div>

                <p className="mt-2 text-2xl font-black text-white">
                  {members.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Active
                  </span>

                  <UserCheck className="h-4 w-4 text-white/60" />
                </div>

                <p className="mt-2 text-2xl font-black text-white">
                  {activeMembers}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Roles
                  </span>

                  <Shield className="h-4 w-4 text-white/60" />
                </div>

                <p className="mt-2 text-2xl font-black text-white">
                  {roles.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Permissions
                  </span>

                  <Activity className="h-4 w-4 text-white/60" />
                </div>

                <p className="mt-2 text-2xl font-black text-white">
                  {permissions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {/* Tabs */}
          <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                const visible =
                  (tab.id ===
                    "members" &&
                    canViewMembers) ||
                  (tab.id ===
                    "roles" &&
                    canViewRoles) ||
                  (tab.id ===
                    "permissions" &&
                    canViewPermissions) ||
                  (tab.id ===
                    "audit" &&
                    canViewAudit);

                if (!visible) {
                  return null;
                }

                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      active
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Users className="h-6 w-6" />
              </div>

              <h2 className="mt-5 font-bold text-slate-900">
                Loading workspace access...
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Fetching members, roles and permissions.
              </p>
            </div>
          ) : (
            <>
              {/* MEMBERS */}
              {activeTab ===
                "members" &&
                canViewMembers && (
                  <section className="space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Workspace members
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Control who has access to this workspace and what they can do.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            value={search}
                            onChange={(
                              event,
                            ) =>
                              setSearch(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder="Search members by name or email..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                          />
                        </div>

                        <select
                          value={
                            roleFilter
                          }
                          onChange={(
                            event,
                          ) =>
                            setRoleFilter(
                              event
                                .target
                                .value,
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:bg-white"
                        >
                          <option value="all">
                            All roles
                          </option>

                          {roles.map(
                            (
                              role,
                            ) => (
                              <option
                                key={
                                  role.id
                                }
                                value={
                                  role.name
                                }
                              >
                                {
                                  role.name
                                }
                              </option>
                            ),
                          )}
                        </select>

                        <select
                          value={
                            statusFilter
                          }
                          onChange={(
                            event,
                          ) =>
                            setStatusFilter(
                              event
                                .target
                                .value,
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:bg-white"
                        >
                          <option value="all">
                            All statuses
                          </option>
                          <option value="Active">
                            Active
                          </option>
                          <option value="Suspended">
                            Suspended
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                          <thead className="border-b border-slate-100 bg-slate-50/70">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                Member
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                Role
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                Status
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                Overrides
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                Joined
                              </th>

                              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map(
                              (
                                member,
                              ) => {
                                const isOwner =
                                  member.role.name ===
                                  "Owner";

                                return (
                                  <tr
                                    key={
                                      member.id
                                    }
                                    className="transition hover:bg-slate-50/70"
                                  >
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                            member
                                              .user
                                              .name,
                                          )} text-sm font-bold text-white shadow-md`}
                                        >
                                          {getInitials(
                                            member
                                              .user
                                              .name,
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <p className="truncate font-bold text-slate-900">
                                            {
                                              member
                                                .user
                                                .name
                                            }
                                          </p>

                                          <p className="truncate text-sm text-slate-500">
                                            {
                                              member
                                                .user
                                                .email
                                            }
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-5">
                                      <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getRoleColor(
                                          member
                                            .role
                                            .name,
                                        )}`}
                                      >
                                        {member
                                          .role
                                          .name ===
                                          "Owner" && (
                                          <Crown className="h-3 w-3" />
                                        )}

                                        {
                                          member
                                            .role
                                            .name
                                        }
                                      </span>
                                    </td>

                                    <td className="px-6 py-5">
                                      <span
                                        className={`inline-flex items-center gap-2 text-xs font-bold ${
                                          member.status ===
                                          "Active"
                                            ? "text-emerald-600"
                                            : "text-red-500"
                                        }`}
                                      >
                                        <span
                                          className={`h-2 w-2 rounded-full ${
                                            member.status ===
                                            "Active"
                                              ? "bg-emerald-500"
                                              : "bg-red-500"
                                          }`}
                                        />

                                        {
                                          member.status
                                        }
                                      </span>
                                    </td>

                                    <td className="px-6 py-5">
                                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                        {
                                          member
                                            .permissionOverrides
                                            .length
                                        }
                                      </span>
                                    </td>

                                    <td className="px-6 py-5 text-sm text-slate-500">
                                      {formatDate(
                                        member.createdAt,
                                      )}
                                    </td>

                                    <td className="px-6 py-5">
                                      <div className="relative flex justify-end">
                                        {!isOwner &&
                                          (canUpdateMembers ||
                                            canSuspendMembers) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setOpenMemberMenu(
                                                  openMemberMenu ===
                                                    member.id
                                                    ? null
                                                    : member.id,
                                                )
                                              }
                                              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            >
                                              <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                          )}

                                        {openMemberMenu ===
                                          member.id && (
                                          <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                            {canUpdateMembers && (
                                              <div className="border-b border-slate-100 pb-2">
                                                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                  Change role
                                                </p>

                                                {roles
                                                  .filter(
                                                    (
                                                      role,
                                                    ) =>
                                                      role.name !==
                                                      "Owner",
                                                  )
                                                  .map(
                                                    (
                                                      role,
                                                    ) => (
                                                      <button
                                                        key={
                                                          role.id
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                          handleRoleChange(
                                                            member,
                                                            role.id,
                                                          )
                                                        }
                                                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                      >
                                                        {
                                                          role.name
                                                        }

                                                        {member
                                                          .role
                                                          .id ===
                                                          role.id && (
                                                          <Check className="h-4 w-4 text-violet-600" />
                                                        )}
                                                      </button>
                                                    ),
                                                  )}
                                              </div>
                                            )}

                                            {canSuspendMembers && (
                                              <div className="pt-2">
                                                {member.status ===
                                                "Active" ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleStatusChange(
                                                        member,
                                                        "Suspended",
                                                      )
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                                                  >
                                                    <X className="h-4 w-4" />
                                                    Suspend member
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleStatusChange(
                                                        member,
                                                        "Active",
                                                      )
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                                                  >
                                                    <UserCheck className="h-4 w-4" />
                                                    Restore member
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-slate-100 md:hidden">
                        {filteredMembers.map(
                          (
                            member,
                          ) => {
                            const isOwner =
                              member.role.name ===
                              "Owner";

                            return (
                              <div
                                key={
                                  member.id
                                }
                                className="p-5"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div
                                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                        member
                                          .user
                                          .name,
                                      )} text-sm font-bold text-white`}
                                    >
                                      {getInitials(
                                        member
                                          .user
                                          .name,
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate font-bold text-slate-900">
                                        {
                                          member
                                            .user
                                            .name
                                        }
                                      </p>

                                      <p className="truncate text-xs text-slate-500">
                                        {
                                          member
                                            .user
                                            .email
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  {!isOwner &&
                                    (canUpdateMembers ||
                                      canSuspendMembers) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenMemberMenu(
                                            openMemberMenu ===
                                              member.id
                                              ? null
                                              : member.id,
                                          )
                                        }
                                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                                      >
                                        <MoreHorizontal className="h-5 w-5" />
                                      </button>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getRoleColor(
                                      member
                                        .role
                                        .name,
                                    )}`}
                                  >
                                    {
                                      member
                                        .role
                                        .name
                                    }
                                  </span>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                      member.status ===
                                      "Active"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    {
                                      member.status
                                    }
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                    {
                                      member
                                        .permissionOverrides
                                        .length
                                    }{" "}
                                    overrides
                                  </span>
                                </div>

                                {openMemberMenu ===
                                  member.id && (
                                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    {canUpdateMembers && (
                                      <div>
                                        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                          Change role
                                        </p>

                                        <div className="space-y-1">
                                          {roles
                                            .filter(
                                              (
                                                role,
                                              ) =>
                                                role.name !==
                                                "Owner",
                                            )
                                            .map(
                                              (
                                                role,
                                              ) => (
                                                <button
                                                  key={
                                                    role.id
                                                  }
                                                  type="button"
                                                  onClick={() =>
                                                    handleRoleChange(
                                                      member,
                                                      role.id,
                                                    )
                                                  }
                                                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-white"
                                                >
                                                  {
                                                    role.name
                                                  }

                                                  {member
                                                    .role
                                                    .id ===
                                                    role.id && (
                                                    <Check className="h-4 w-4 text-violet-600" />
                                                  )}
                                                </button>
                                              ),
                                            )}
                                        </div>
                                      </div>
                                    )}

                                    {canSuspendMembers && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleStatusChange(
                                            member,
                                            member.status ===
                                              "Active"
                                              ? "Suspended"
                                              : "Active",
                                          )
                                        }
                                        className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700"
                                      >
                                        {member.status ===
                                        "Active" ? (
                                          <>
                                            <X className="h-4 w-4 text-red-500" />
                                            Suspend member
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="h-4 w-4 text-emerald-500" />
                                            Restore member
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      {filteredMembers.length ===
                        0 && (
                        <div className="p-12 text-center">
                          <Users className="mx-auto h-10 w-10 text-slate-300" />

                          <h3 className="mt-4 font-bold text-slate-900">
                            No members found
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Try changing your search or filters.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

              {/* ROLES */}
              {activeTab ===
                "roles" &&
                canViewRoles && (
                  <section className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Roles
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Define reusable access profiles for your workspace.
                        </p>
                      </div>

                      {canCreateRoles && (
                        <button
                          type="button"
                          onClick={
                            openCreateRole
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
                        >
                          <Plus className="h-4 w-4" />
                          Create role
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Total roles
                        </p>

                        <p className="mt-2 text-2xl font-black text-slate-900">
                          {roles.length}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          System roles
                        </p>

                        <p className="mt-2 text-2xl font-black text-violet-600">
                          {systemRoles}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Custom roles
                        </p>

                        <p className="mt-2 text-2xl font-black text-blue-600">
                          {customRoles}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Permissions
                        </p>

                        <p className="mt-2 text-2xl font-black text-emerald-600">
                          {permissions.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      {roles.map(
                        (role) => {
                          const allowedCount =
                            role.rolePermissions.filter(
                              (
                                permission,
                              ) =>
                                permission.effect ===
                                "Allow",
                            ).length;

                          return (
                            <div
                              key={
                                role.id
                              }
                              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                      role.name ===
                                      "Owner"
                                        ? "bg-amber-100 text-amber-600"
                                        : role.name ===
                                            "Admin"
                                          ? "bg-violet-100 text-violet-600"
                                          : "bg-blue-100 text-blue-600"
                                    }`}
                                  >
                                    {role.name ===
                                    "Owner" ? (
                                      <Crown className="h-5 w-5" />
                                    ) : (
                                      <Shield className="h-5 w-5" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-bold text-slate-900">
                                        {
                                          role.name
                                        }
                                      </h3>

                                      {role.isSystem && (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                          System
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                      {role.description ||
                                        "No description provided."}
                                    </p>
                                  </div>
                                </div>

                                {!role.isSystem &&
                                  (canUpdateRoles ||
                                    canDeleteRoles) && (
                                    <div className="flex shrink-0 gap-1">
                                      {canUpdateRoles && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditRole(
                                              role,
                                            )
                                          }
                                          className="rounded-xl p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                                          title="Edit role"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                      )}

                                      {canDeleteRoles && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteRole(
                                              role,
                                            )
                                          }
                                          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                          title="Delete role"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div className="mt-6 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Members
                                  </p>

                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    {
                                      role
                                        ._count
                                        .members
                                    }
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Permissions
                                  </p>

                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    {
                                      allowedCount
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="mt-5 flex flex-wrap gap-2">
                                {role.rolePermissions
                                  .filter(
                                    (
                                      entry,
                                    ) =>
                                      entry.effect ===
                                      "Allow",
                                  )
                                  .slice(
                                    0,
                                    5,
                                  )
                                  .map(
                                    (
                                      entry,
                                    ) => (
                                      <span
                                        key={
                                          entry.id
                                        }
                                        className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                                      >
                                        {
                                          entry
                                            .permission
                                            .name
                                        }
                                      </span>
                                    ),
                                  )}

                                {allowedCount >
                                  5 && (
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                    +
                                    {allowedCount -
                                      5}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </section>
                )}

              {/* PERMISSIONS */}
              {activeTab ===
                "permissions" &&
                canViewPermissions && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Permission catalog
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Review every permission available inside this workspace.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={
                            permissionSearch
                          }
                          onChange={(
                            event,
                          ) =>
                            setPermissionSearch(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Search permissions..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-5">
                      {permissionGroups.map(
                        ([
                          category,
                          categoryPermissions,
                        ]) => (
                          <div
                            key={
                              category
                            }
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {
                                    category
                                  }
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  {
                                    categoryPermissions.length
                                  }{" "}
                                  permissions
                                </p>
                              </div>

                              <Activity className="h-5 w-5 text-violet-500" />
                            </div>

                            <div className="divide-y divide-slate-100">
                              {categoryPermissions.map(
                                (
                                  permission,
                                ) => (
                                  <div
                                    key={
                                      permission.id
                                    }
                                    className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900">
                                        {
                                          permission.name
                                        }
                                      </p>

                                      <p className="mt-1 break-all font-mono text-xs text-violet-600">
                                        {
                                          permission.key
                                        }
                                      </p>

                                      {permission.description && (
                                        <p className="mt-1 text-sm text-slate-500">
                                          {
                                            permission.description
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                      Available
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ),
                      )}

                      {permissionGroups.length ===
                        0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                          <Activity className="mx-auto h-10 w-10 text-slate-300" />

                          <p className="mt-4 font-bold text-slate-900">
                            No permissions found
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

              {/* AUDIT */}
              {activeTab ===
                "audit" &&
                canViewAudit && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        RBAC audit log
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Review role, member and permission changes across the workspace.
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                          <thead className="border-b border-slate-100 bg-slate-50/70">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                Action
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                Description
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                Actor
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                Target
                              </th>

                              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                                Time
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {auditLogs.map(
                              (
                                log,
                              ) => (
                                <tr
                                  key={
                                    log.id
                                  }
                                  className="hover:bg-slate-50/70"
                                >
                                  <td className="px-6 py-5">
                                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                                      {
                                        log.action
                                      }
                                    </span>
                                  </td>

                                  <td className="max-w-md px-6 py-5 text-sm text-slate-700">
                                    {
                                      log.description
                                    }
                                  </td>

                                  <td className="px-6 py-5">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        {log
                                          .actor
                                          ?.name ||
                                          "System"}
                                      </p>

                                      <p className="text-xs text-slate-500">
                                        {log
                                          .actor
                                          ?.email ||
                                          "—"}
                                      </p>
                                    </div>
                                  </td>

                                  <td className="px-6 py-5">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {log
                                        .member
                                        ?.user
                                        .name ||
                                        log.entityType}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {
                                        log.entityType
                                      }
                                    </p>
                                  </td>

                                  <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                                    {formatDate(
                                      log.createdAt,
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-slate-100 md:hidden">
                        {auditLogs.map(
                          (
                            log,
                          ) => (
                            <div
                              key={
                                log.id
                              }
                              className="p-5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                                  {
                                    log.action
                                  }
                                </span>

                                <span className="text-xs text-slate-400">
                                  {formatDate(
                                    log.createdAt,
                                  )}
                                </span>
                              </div>

                              <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                                {
                                  log.description
                                }
                              </p>

                              <div className="mt-3 text-xs text-slate-500">
                                Actor:{" "}
                                <span className="font-semibold text-slate-700">
                                  {log
                                    .actor
                                    ?.name ||
                                    "System"}
                                </span>
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      {auditLogs.length ===
                        0 && (
                        <div className="p-12 text-center">
                          <History className="mx-auto h-10 w-10 text-slate-300" />

                          <p className="mt-4 font-bold text-slate-900">
                            No audit events yet
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Workspace access changes will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
            </>
          )}
        </main>

        {/* ROLE MODAL */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedRole
                      ? "Edit role"
                      : "Create custom role"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Define the role's identity and permissions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowRoleModal(
                      false,
                    )
                  }
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Role name
                    </label>

                    <input
                      value={roleName}
                      onChange={(
                        event,
                      ) =>
                        setRoleName(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="e.g. Finance Manager"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Description
                    </label>

                    <input
                      value={
                        roleDescription
                      }
                      onChange={(
                        event,
                      ) =>
                        setRoleDescription(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="What is this role responsible for?"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                    />
                  </div>
                </div>

                <div className="mt-7">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Permissions
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Select the permissions this role should have.
                      </p>
                    </div>

                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      {
                        selectedPermissionIds.length
                      }{" "}
                      selected
                    </span>
                  </div>

                  <div className="space-y-4">
                    {permissionGroups.map(
                      ([
                        category,
                        categoryPermissions,
                      ]) => (
                        <div
                          key={
                            category
                          }
                          className="rounded-2xl border border-slate-200"
                        >
                          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-sm font-bold text-slate-900">
                              {
                                category
                              }
                            </p>
                          </div>

                          <div className="grid gap-2 p-3 md:grid-cols-2">
                            {categoryPermissions.map(
                              (
                                permission,
                              ) => {
                                const selected =
                                  selectedPermissionIds.includes(
                                    permission.id,
                                  );

                                return (
                                  <button
                                    key={
                                      permission.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      togglePermission(
                                        permission.id,
                                      )
                                    }
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                                      selected
                                        ? "border-violet-300 bg-violet-50"
                                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div
                                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                        selected
                                          ? "border-violet-600 bg-violet-600 text-white"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {selected && (
                                        <Check className="h-3.5 w-3.5" />
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800">
                                        {
                                          permission.name
                                        }
                                      </p>

                                      <p className="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                                        {
                                          permission.key
                                        }
                                      </p>
                                    </div>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowRoleModal(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveRole
                  }
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : selectedRole
                      ? "Save role"
                      : "Create role"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}