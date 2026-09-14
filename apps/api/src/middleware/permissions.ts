import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

type AuthenticatedRequest = Request & {
  userId?: unknown;
};

function getUserId(req: Request): number {
  const userId = (req as AuthenticatedRequest).userId;

  if (
    typeof userId !== "number" ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new Error("Authenticated user ID is missing");
  }

  return userId;
}

/**
 * Finds the authenticated user's active workspace membership.
 *
 * FreelanceOS currently initializes one workspace per installation.
 * This helper intentionally keeps workspace resolution centralized so
 * multi-workspace selection can be introduced later without rewriting
 * every permission check.
 */
export async function getWorkspaceMember(userId: number) {
  return prisma.workspaceMember.findFirst({
    where: {
      userId,
      status: "Active",
    },
    include: {
      workspace: true,
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      permissionOverrides: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

/**
 * Returns the effective permission state for a workspace member.
 *
 * Resolution:
 *
 *   Role permissions
 *          +
 *   Member overrides
 *          ↓
 *   Effective permission
 *
 * A member override takes precedence over the role permission.
 */
export async function hasPermission(
  userId: number,
  permissionKey: string,
): Promise<boolean> {
  const member = await getWorkspaceMember(userId);

  if (!member) {
    return false;
  }

  const rolePermission = member.role.rolePermissions.find(
    (entry) => entry.permission.key === permissionKey,
  );

  const memberOverride = member.permissionOverrides.find(
    (entry) => entry.permission.key === permissionKey,
  );

  if (memberOverride) {
    return memberOverride.effect === "Allow";
  }

  if (rolePermission) {
    return rolePermission.effect === "Allow";
  }

  return false;
}

/**
 * Middleware factory for protecting API routes with a permission.
 *
 * Usage:
 *
 * router.get(
 *   "/",
 *   requirePermission("clients.view"),
 *   async (req, res) => {
 *     ...
 *   }
 * );
 */
export function requirePermission(permissionKey: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = getUserId(req);

      const allowed = await hasPermission(
        userId,
        permissionKey,
      );

      if (!allowed) {
        res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
          permission: permissionKey,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Returns the authenticated user's current RBAC context.
 *
 * Useful for /api/auth/me and frontend permission-aware UI.
 */
export async function getAuthorizationContext(
  userId: number,
) {
  const member = await getWorkspaceMember(userId);

  if (!member) {
    return null;
  }

  const rolePermissions = member.role.rolePermissions
    .filter(
      (entry) => entry.effect === "Allow",
    )
    .map((entry) => entry.permission.key);

  const overridePermissions = member.permissionOverrides.map(
    (entry) => ({
      key: entry.permission.key,
      effect: entry.effect,
    }),
  );

  const effectivePermissions = new Set(
    rolePermissions,
  );

  for (const override of overridePermissions) {
    if (override.effect === "Allow") {
      effectivePermissions.add(override.key);
    } else {
      effectivePermissions.delete(override.key);
    }
  }

  return {
    workspaceId: member.workspaceId,
    workspaceName: member.workspace.name,
    memberId: member.id,
    roleId: member.roleId,
    roleName: member.role.name,
    status: member.status,
    permissions: Array.from(effectivePermissions).sort(),
  };
}