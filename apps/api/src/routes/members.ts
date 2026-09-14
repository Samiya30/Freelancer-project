import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceMember,
  hasPermission,
} from "../middleware/permissions.js";

const router = Router();

router.use(requireAuth);

function getUserId(req: Request): number {
  const userId = (req as Request & { userId?: unknown }).userId;

  if (
    typeof userId !== "number" ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new Error("Authenticated user ID is missing");
  }

  return userId;
}

async function requireCurrentMember(userId: number) {
  const member = await getWorkspaceMember(userId);

  if (!member) {
    throw new Error("Active workspace membership not found");
  }

  return member;
}

/**
 * Return the actor's effective permission keys.
 *
 * Effective permissions =
 * role permissions + Allow overrides - Deny overrides
 */
async function getEffectivePermissionKeys(
  userId: number,
): Promise<Set<string>> {
  const member = await requireCurrentMember(userId);

  const permissions = new Set<string>();

  for (const entry of member.role.rolePermissions) {
    if (entry.effect === "Allow") {
      permissions.add(entry.permission.key);
    }
  }

  for (const override of member.permissionOverrides) {
    if (override.effect === "Allow") {
      permissions.add(override.permission.key);
    } else {
      permissions.delete(override.permission.key);
    }
  }

  return permissions;
}

/**
 * Check whether the actor can assign every permission
 * contained in a target role.
 */
async function canAssignRole(
  actorUserId: number,
  roleId: number,
): Promise<{
  allowed: boolean;
  missingPermission?: string;
}> {
  const actorPermissions =
    await getEffectivePermissionKeys(actorUserId);

  const rolePermissions =
    await prisma.rolePermission.findMany({
      where: {
        roleId,
        effect: "Allow",
      },
      include: {
        permission: true,
      },
    });

  const unauthorizedPermission =
    rolePermissions.find(
      (entry) =>
        !actorPermissions.has(entry.permission.key),
    );

  if (unauthorizedPermission) {
    return {
      allowed: false,
      missingPermission:
        unauthorizedPermission.permission.key,
    };
  }

  return { allowed: true };
}

/**
 * Validate permission IDs belong to the current workspace
 * and that the actor possesses every permission.
 */
async function validateRolePermissions(
  actorUserId: number,
  workspaceId: number,
  permissionIds: number[],
) {
  const uniquePermissionIds = [
    ...new Set(permissionIds),
  ];

  const permissions =
    await prisma.permission.findMany({
      where: {
        workspaceId,
        id: {
          in: uniquePermissionIds,
        },
      },
    });

  if (
    permissions.length !==
    uniquePermissionIds.length
  ) {
    return {
      valid: false as const,
      status: 400,
      message:
        "One or more permissions do not belong to this workspace.",
    };
  }

  const actorPermissions =
    await getEffectivePermissionKeys(
      actorUserId,
    );

  const unauthorizedPermission =
    permissions.find(
      (permission) =>
        !actorPermissions.has(permission.key),
    );

  if (unauthorizedPermission) {
    return {
      valid: false as const,
      status: 403,
      message:
        "You cannot assign a permission you do not possess.",
      permission:
        unauthorizedPermission.key,
    };
  }

  return {
    valid: true as const,
    permissions,
  };
};

/**
 * GET /api/members
 *
 * View workspace members.
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    const allowed = await hasPermission(
      userId,
      "members.view",
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view team members.",
      });
    }

    const currentMember =
      await requireCurrentMember(userId);

    const members =
      await prisma.workspaceMember.findMany({
        where: {
          workspaceId:
            currentMember.workspaceId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              bio: true,
              createdAt: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              isSystem: true,
            },
          },
          permissionOverrides: {
            include: {
              permission: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error(
      "GET /api/members error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch team members.",
    });
  }
});

/**
 * PATCH /api/members/:id/role
 *
 * Change a member's workspace role.
 */
router.patch("/:id/role", async (req, res) => {
  try {
    const actorUserId = getUserId(req);
    const memberId = Number(req.params.id);

    if (
      !Number.isInteger(memberId) ||
      memberId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
    }

    const parsed = z
      .object({
        roleId: z.number().int().positive(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "A valid roleId is required.",
        errors: parsed.error.flatten(),
      });
    }

    const canUpdate =
      await hasPermission(
        actorUserId,
        "members.update",
      );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to change member roles.",
      });
    }

    const actor =
      await requireCurrentMember(actorUserId);

    const target =
      await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId:
            actor.workspaceId,
        },
        include: {
          user: true,
          role: true,
          workspace: true,
        },
      });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    if (
      target.userId ===
      actor.workspace.ownerId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "The workspace owner's role cannot be changed here.",
      });
    }

    const newRole =
      await prisma.role.findFirst({
        where: {
          id: parsed.data.roleId,
          workspaceId:
            actor.workspaceId,
        },
      });

    if (!newRole) {
      return res.status(404).json({
        success: false,
        message:
          "Role not found in this workspace.",
      });
    }

    if (
      newRole.name === "Owner" &&
      actor.role.name !== "Owner"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can assign the Owner role.",
      });
    }

    if (
      newRole.name === "Admin" &&
      actor.role.name !== "Owner"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can assign the Admin role.",
      });
    }

    const roleCheck =
      await canAssignRole(
        actorUserId,
        newRole.id,
      );

    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot assign a role containing permissions you do not possess.",
        permission:
          roleCheck.missingPermission,
      });
    }

    const oldRoleName = target.role.name;

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const updatedMember =
            await tx.workspaceMember.update({
              where: {
                id: target.id,
              },
              data: {
                roleId: newRole.id,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                role: true,
              },
            });

          await tx.auditLog.create({
            data: {
              action:
                newRole.name === "Admin" ||
                newRole.name === "Team Lead"
                  ? "Promoted"
                  : "Updated",
              entityType:
                "WorkspaceMember",
              entityId:
                String(target.id),
              description:
                `Member role changed from ${oldRoleName} to ${newRole.name}.`,
              metadata: {
                oldRole: oldRoleName,
                newRole: newRole.name,
                targetUserId:
                  target.userId,
              },
              workspaceId:
                actor.workspaceId,
              actorId: actorUserId,
              memberId: target.id,
            },
          });

          return updatedMember;
        },
      );

    return res.status(200).json({
      success: true,
      message:
        "Member role updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/members/:id/role error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update member role.",
    });
  }
});

/**
 * PATCH /api/members/:id/status
 *
 * Suspend or restore a member.
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const actorUserId = getUserId(req);
    const memberId = Number(req.params.id);

    if (
      !Number.isInteger(memberId) ||
      memberId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
    }

    const parsed = z
      .object({
        status: z.enum([
          "Active",
          "Suspended",
        ]),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be Active or Suspended.",
        errors: parsed.error.flatten(),
      });
    }

    const allowed =
      await hasPermission(
        actorUserId,
        "members.suspend",
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to suspend or restore members.",
      });
    }

    const actor =
      await requireCurrentMember(actorUserId);

    const target =
      await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId:
            actor.workspaceId,
        },
        include: {
          role: true,
          workspace: true,
        },
      });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    if (
      target.userId ===
      actor.workspace.ownerId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "The workspace owner cannot be suspended.",
      });
    }

    if (
      target.role.name === "Admin" &&
      actor.role.name !== "Owner"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can suspend an Admin.",
      });
    }

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const member =
            await tx.workspaceMember.update({
              where: {
                id: target.id,
              },
              data: {
                status:
                  parsed.data.status,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                role: true,
              },
            });

          await tx.auditLog.create({
            data: {
              action:
                parsed.data.status ===
                "Suspended"
                  ? "Suspended"
                  : "Restored",
              entityType:
                "WorkspaceMember",
              entityId:
                String(target.id),
              description:
                `Member status changed to ${parsed.data.status}.`,
              metadata: {
                status:
                  parsed.data.status,
                targetUserId:
                  target.userId,
              },
              workspaceId:
                actor.workspaceId,
              actorId: actorUserId,
              memberId: target.id,
            },
          });

          return member;
        },
      );

    return res.status(200).json({
      success: true,
      message: `Member ${parsed.data.status.toLowerCase()} successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/members/:id/status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update member status.",
    });
  }
});

/**
 * POST /api/members/:id/permissions
 *
 * Grant or revoke an individual permission override.
 */
router.post(
  "/:id/permissions",
  async (req, res) => {
    try {
      const actorUserId = getUserId(req);
      const memberId = Number(req.params.id);

      if (
        !Number.isInteger(memberId) ||
        memberId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID.",
        });
      }

      const parsed = z
        .object({
          permissionId:
            z.number().int().positive(),
          effect: z.enum([
            "Allow",
            "Deny",
          ]),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message:
            "permissionId and effect are required.",
          errors: parsed.error.flatten(),
        });
      }

      const canGrant =
        await hasPermission(
          actorUserId,
          "permissions.grant",
        );

      const canRevoke =
        await hasPermission(
          actorUserId,
          "permissions.revoke",
        );

      if (
        parsed.data.effect === "Allow" &&
        !canGrant
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to grant permissions.",
        });
      }

      if (
        parsed.data.effect === "Deny" &&
        !canRevoke
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to revoke permissions.",
        });
      }

      const actor =
        await requireCurrentMember(actorUserId);

      const target =
        await prisma.workspaceMember.findFirst({
          where: {
            id: memberId,
            workspaceId:
              actor.workspaceId,
          },
          include: {
            role: true,
            workspace: true,
          },
        });

      if (!target) {
        return res.status(404).json({
          success: false,
          message: "Member not found.",
        });
      }

      if (
        target.userId ===
        actor.workspace.ownerId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "The workspace owner cannot be modified through member overrides.",
        });
      }

      const permission =
        await prisma.permission.findFirst({
          where: {
            id: parsed.data.permissionId,
            workspaceId:
              actor.workspaceId,
          },
        });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message:
            "Permission not found in this workspace.",
        });
      }

      const actorHasPermission =
        await hasPermission(
          actorUserId,
          permission.key,
        );

      if (!actorHasPermission) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot grant or assign a permission you do not possess.",
          permission:
            permission.key,
        });
      }

      const override =
        await prisma.$transaction(
          async (tx) => {
            const result =
              await tx.memberPermission.upsert({
                where: {
                  memberId_permissionId: {
                    memberId: target.id,
                    permissionId:
                      permission.id,
                  },
                },
                update: {
                  effect:
                    parsed.data.effect,
                  grantedById:
                    actorUserId,
                },
                create: {
                  memberId: target.id,
                  permissionId:
                    permission.id,
                  effect:
                    parsed.data.effect,
                  grantedById:
                    actorUserId,
                },
                include: {
                  permission: true,
                },
              });

            await tx.auditLog.create({
              data: {
                action:
                  parsed.data.effect ===
                  "Allow"
                    ? "Granted"
                    : "Revoked",
                entityType:
                  "MemberPermission",
                entityId:
                  String(result.id),
                description:
                  `${permission.key} ${parsed.data.effect === "Allow" ? "granted to" : "revoked from"} member.`,
                metadata: {
                  permission:
                    permission.key,
                  effect:
                    parsed.data.effect,
                  targetUserId:
                    target.userId,
                },
                workspaceId:
                  actor.workspaceId,
                actorId:
                  actorUserId,
                memberId:
                  target.id,
              },
            });

            return result;
          },
        );

      return res.status(200).json({
        success: true,
        message:
          parsed.data.effect === "Allow"
            ? "Permission granted successfully."
            : "Permission revoked successfully.",
        data: override,
      });
    } catch (error) {
      console.error(
        "POST /api/members/:id/permissions error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update member permission.",
      });
    }
  },
);

/**
 * GET /api/members/roles
 *
 * List workspace roles.
 */
router.get("/roles", async (req, res) => {
  try {
    const userId = getUserId(req);

    const allowed =
      await hasPermission(
        userId,
        "roles.view",
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view roles.",
      });
    }

    const member =
      await requireCurrentMember(userId);

    const roles =
      await prisma.role.findMany({
        where: {
          workspaceId:
            member.workspaceId,
        },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error(
      "GET /api/members/roles error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch roles.",
    });
  }
});

/**
 * POST /api/members/roles
 *
 * Create a custom workspace role.
 */
router.post("/roles", async (req, res) => {
  try {
    const actorUserId = getUserId(req);

    const allowed =
      await hasPermission(
        actorUserId,
        "roles.create",
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create roles.",
      });
    }

    const parsed = z
      .object({
        name: z
          .string()
          .trim()
          .min(2)
          .max(100),
        description: z
          .string()
          .trim()
          .max(500)
          .optional()
          .default(""),
        permissionIds: z
          .array(
            z.number().int().positive(),
          )
          .default([]),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role data.",
        errors: parsed.error.flatten(),
      });
    }

    const actor =
      await requireCurrentMember(
        actorUserId,
      );

    const existing =
      await prisma.role.findFirst({
        where: {
          workspaceId:
            actor.workspaceId,
          name: parsed.data.name,
        },
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "A role with this name already exists.",
      });
    }

    const permissionValidation =
      await validateRolePermissions(
        actorUserId,
        actor.workspaceId,
        parsed.data.permissionIds,
      );

    if (!permissionValidation.valid) {
      return res.status(
        permissionValidation.status,
      ).json({
        success: false,
        message:
          permissionValidation.message,
        ...(permissionValidation.permission
          ? {
              permission:
                permissionValidation.permission,
            }
          : {}),
      });
    }

    const role =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.role.create({
              data: {
                name: parsed.data.name,
                description:
                  parsed.data.description,
                isSystem: false,
                workspaceId:
                  actor.workspaceId,
                createdById:
                  actorUserId,
              },
            });

          if (
            permissionValidation.permissions
              .length > 0
          ) {
            await tx.rolePermission.createMany({
              data:
                permissionValidation.permissions.map(
                  (permission) => ({
                    roleId: created.id,
                    permissionId:
                      permission.id,
                    effect: "Allow",
                  }),
                ),
            });
          }

          await tx.auditLog.create({
            data: {
              action: "RoleCreated",
              entityType: "Role",
              entityId:
                String(created.id),
              description:
                `Custom role "${created.name}" was created.`,
              metadata: {
                roleName: created.name,
                permissionIds:
                  parsed.data.permissionIds,
              },
              workspaceId:
                actor.workspaceId,
              actorId:
                actorUserId,
            },
          });

          return tx.role.findUnique({
            where: {
              id: created.id,
            },
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          });
        },
      );

    return res.status(201).json({
      success: true,
      message:
        "Custom role created successfully.",
      data: role,
    });
  } catch (error) {
    console.error(
      "POST /api/members/roles error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create role.",
    });
  }
});

/**
 * PATCH /api/members/roles/:id
 *
 * Update a custom role.
 */
router.patch(
  "/roles/:id",
  async (req, res) => {
    try {
      const actorUserId = getUserId(req);
      const roleId = Number(req.params.id);

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID.",
        });
      }

      const allowed =
        await hasPermission(
          actorUserId,
          "roles.update",
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to update roles.",
        });
      }

      const parsed = z
        .object({
          name: z
            .string()
            .trim()
            .min(2)
            .max(100)
            .optional(),
          description: z
            .string()
            .trim()
            .max(500)
            .optional(),
          permissionIds: z
            .array(
              z.number().int().positive(),
            )
            .optional(),
        })
        .refine(
          (data) =>
            data.name !== undefined ||
            data.description !== undefined ||
            data.permissionIds !==
              undefined,
          {
            message:
              "At least one field must be provided.",
          },
        )
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role update.",
          errors: parsed.error.flatten(),
        });
      }

      const actor =
        await requireCurrentMember(
          actorUserId,
        );

      const role =
        await prisma.role.findFirst({
          where: {
            id: roleId,
            workspaceId:
              actor.workspaceId,
          },
        });

      if (!role) {
        return res.status(404).json({
          success: false,
          message:
            "Role not found in this workspace.",
        });
      }

      if (role.isSystem) {
        return res.status(403).json({
          success: false,
          message:
            "System roles cannot be modified.",
        });
      }

      if (
        parsed.data.name &&
        parsed.data.name !==
          role.name
      ) {
        const duplicate =
          await prisma.role.findFirst({
            where: {
              workspaceId:
                actor.workspaceId,
              name: parsed.data.name,
              NOT: {
                id: role.id,
              },
            },
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "A role with this name already exists.",
          });
        }
      }

      let permissions =
        undefined;

      if (
        parsed.data.permissionIds !==
        undefined
      ) {
        const validation =
          await validateRolePermissions(
            actorUserId,
            actor.workspaceId,
            parsed.data.permissionIds,
          );

        if (!validation.valid) {
          return res.status(
            validation.status,
          ).json({
            success: false,
            message:
              validation.message,
            ...(validation.permission
              ? {
                  permission:
                    validation.permission,
                }
              : {}),
          });
        }

        permissions =
          validation.permissions;
      }

      const updated =
        await prisma.$transaction(
          async (tx) => {
            const updatedRole =
              await tx.role.update({
                where: {
                  id: role.id,
                },
                data: {
                  ...(parsed.data.name !==
                  undefined
                    ? {
                        name:
                          parsed.data
                            .name,
                      }
                    : {}),
                  ...(parsed.data
                    .description !==
                  undefined
                    ? {
                        description:
                          parsed.data
                            .description,
                      }
                    : {}),
                },
              });

            if (
              parsed.data.permissionIds !==
              undefined
            ) {
              await tx.rolePermission.deleteMany(
                {
                  where: {
                    roleId: role.id,
                  },
                },
              );

              if (
                permissions &&
                permissions.length > 0
              ) {
                await tx.rolePermission.createMany(
                  {
                    data:
                      permissions.map(
                        (
                          permission,
                        ) => ({
                          roleId:
                            role.id,
                          permissionId:
                            permission.id,
                          effect:
                            "Allow",
                        }),
                      ),
                  },
                );
              }
            }

            await tx.auditLog.create({
              data: {
                action: "RoleUpdated",
                entityType: "Role",
                entityId:
                  String(role.id),
                description:
                  `Custom role "${role.name}" was updated.`,
                metadata: {
                  oldName: role.name,
                  newName:
                    parsed.data.name ??
                    role.name,
                  permissionIds:
                    parsed.data
                      .permissionIds,
                },
                workspaceId:
                  actor.workspaceId,
                actorId:
                  actorUserId,
              },
            });

            return tx.role.findUnique({
              where: {
                id: role.id,
              },
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
                _count: {
                  select: {
                    members: true,
                  },
                },
              },
            });
          },
        );

      return res.status(200).json({
        success: true,
        message:
          "Role updated successfully.",
        data: updated,
      });
    } catch (error) {
      console.error(
        "PATCH /api/members/roles/:id error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update role.",
      });
    }
  },
);

/**
 * DELETE /api/members/roles/:id
 *
 * Delete a custom role.
 */
router.delete(
  "/roles/:id",
  async (req, res) => {
    try {
      const actorUserId = getUserId(req);
      const roleId = Number(req.params.id);

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID.",
        });
      }

      const allowed =
        await hasPermission(
          actorUserId,
          "roles.delete",
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to delete roles.",
        });
      }

      const actor =
        await requireCurrentMember(
          actorUserId,
        );

      const role =
        await prisma.role.findFirst({
          where: {
            id: roleId,
            workspaceId:
              actor.workspaceId,
          },
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        });

      if (!role) {
        return res.status(404).json({
          success: false,
          message:
            "Role not found in this workspace.",
        });
      }

      if (role.isSystem) {
        return res.status(403).json({
          success: false,
          message:
            "System roles cannot be deleted.",
        });
      }

      if (role._count.members > 0) {
        return res.status(409).json({
          success: false,
          message:
            "This role cannot be deleted while it is assigned to workspace members.",
          memberCount:
            role._count.members,
        });
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.auditLog.create({
            data: {
              action: "RoleDeleted",
              entityType: "Role",
              entityId:
                String(role.id),
              description:
                `Custom role "${role.name}" was deleted.`,
              metadata: {
                roleName: role.name,
              },
              workspaceId:
                actor.workspaceId,
              actorId:
                actorUserId,
            },
          });

          await tx.role.delete({
            where: {
              id: role.id,
            },
          });
        },
      );

      return res.status(200).json({
        success: true,
        message:
          "Role deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/members/roles/:id error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete role.",
      });
    }
  },
);

/**
 * GET /api/members/permissions
 *
 * List available permissions.
 */
router.get(
  "/permissions",
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const allowed =
        await hasPermission(
          userId,
          "permissions.view",
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to view permissions.",
        });
      }

      const member =
        await requireCurrentMember(userId);

      const permissions =
        await prisma.permission.findMany({
          where: {
            workspaceId:
              member.workspaceId,
          },
          orderBy: [
            {
              category: "asc",
            },
            {
              name: "asc",
            },
          ],
        });

      return res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      console.error(
        "GET /api/members/permissions error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch permissions.",
      });
    }
  },
);

/**
 * GET /api/members/audit
 *
 * Workspace RBAC audit history.
 */
router.get(
  "/audit",
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const allowed =
        await hasPermission(
          userId,
          "audit.view",
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to view the audit log.",
        });
      }

      const member =
        await requireCurrentMember(userId);

      const logs =
        await prisma.auditLog.findMany({
          where: {
            workspaceId:
              member.workspaceId,
          },
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 200,
        });

      return res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error(
        "GET /api/members/audit error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch audit log.",
      });
    }
  },
);

export default router;