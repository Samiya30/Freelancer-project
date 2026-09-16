import { api } from "./http";

export type WorkspaceMemberStatus =
  | "Active"
  | "Suspended"
  | "Invited";

export type PermissionEffect =
  | "Allow"
  | "Deny";

export interface MemberUser {
  id: number;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  createdAt: string;
}

export interface MemberRole {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface MemberPermission {
  id: number;
  key: string;
  name: string;
  category: string;
}

export interface MemberPermissionOverride {
  id: number;
  memberId: number;
  permissionId: number;
  effect: PermissionEffect;
  createdAt: string;
  updatedAt: string;
  permission: MemberPermission;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  roleId: number;
  status: WorkspaceMemberStatus;
  createdAt: string;
  updatedAt: string;
  user: MemberUser;
  role: MemberRole;
  permissionOverrides: MemberPermissionOverride[];
}

export interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
  effect: PermissionEffect;
  createdAt: string;
  updatedAt: string;
  permission: MemberPermission;
}

export interface WorkspaceRole {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
  rolePermissions: RolePermission[];
  _count: {
    members: number;
  };
}

export interface WorkspacePermission {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditActor {
  id: number;
  name: string;
  email: string;
}

export interface AuditMember {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: MemberRole;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: unknown;
  createdAt: string;
  workspaceId: number;
  actorId: number | null;
  memberId: number | null;
  actor: AuditActor | null;
  member: AuditMember | null;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

export async function getMembers() {
  return api.get<WorkspaceMember[]>("/api/members");
}

export async function updateMemberRole(
  memberId: number,
  roleId: number,
) {
  return api.patch<WorkspaceMember>(
    `/api/members/${memberId}/role`,
    { roleId },
  );
}

export async function updateMemberStatus(
  memberId: number,
  status: "Active" | "Suspended",
) {
  return api.patch<WorkspaceMember>(
    `/api/members/${memberId}/status`,
    { status },
  );
}

export async function updateMemberPermission(
  memberId: number,
  permissionId: number,
  effect: PermissionEffect,
) {
  return api.post<MemberPermissionOverride>(
    `/api/members/${memberId}/permissions`,
    {
      permissionId,
      effect,
    },
  );
}

export async function getRoles() {
  return api.get<WorkspaceRole[]>(
    "/api/members/roles",
  );
}

export async function createRole(
  data: CreateRoleInput,
) {
  return api.post<WorkspaceRole>(
    "/api/members/roles",
    data,
  );
}

export async function updateRole(
  roleId: number,
  data: UpdateRoleInput,
) {
  return api.patch<WorkspaceRole>(
    `/api/members/roles/${roleId}`,
    data,
  );
}

export async function deleteRole(
  roleId: number,
) {
  return api.delete(
    `/api/members/roles/${roleId}`,
  );
}

export async function getPermissions() {
  return api.get<WorkspacePermission[]>(
    "/api/members/permissions",
  );
}

export async function getAuditLogs() {
  return api.get<AuditLog[]>(
    "/api/members/audit",
  );
}