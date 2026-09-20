import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function getUserId(req: AuthenticatedRequest): number {
  if (!Number.isInteger(req.userId) || req.userId <= 0) {
    throw new Error("Authenticated user ID is missing");
  }

  return req.userId;
}

async function getWorkspaceMember(userId: number) {
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
    },
  });
}

async function requireCurrentMember(req: Request, res: Response) {
  const userId = getUserId(req as unknown as AuthenticatedRequest);

  const member = await getWorkspaceMember(userId);

  if (!member) {
    res.status(403).json({
      success: false,
      message: "You do not belong to an active workspace.",
    });
    return null;
  }

  return member;
}

async function getEffectivePermissionKeys(
  memberId: number,
  roleId: number,
) {
  const [rolePermissions, overrides] = await Promise.all([
    prisma.rolePermission.findMany({
      where: {
        roleId,
      },
      include: {
        permission: true,
      },
    }),
    prisma.memberPermission.findMany({
      where: {
        memberId,
      },
      include: {
        permission: true,
      },
    }),
  ]);

  const permissions = new Map<string, "Allow" | "Deny">();

  for (const rolePermission of rolePermissions) {
    permissions.set(
      rolePermission.permission.key,
      rolePermission.effect,
    );
  }

  for (const override of overrides) {
    permissions.set(
      override.permission.key,
      override.effect,
    );
  }

  return new Set(
    [...permissions.entries()]
      .filter(([, effect]) => effect === "Allow")
      .map(([key]) => key),
  );
}

function hasPermission(
  permissionKeys: Set<string>,
  permission: string,
) {
  return permissionKeys.has(permission);
}

async function canAssignRole(
  actorMemberId: number,
  actorRoleId: number,
  targetRoleId: number,
) {
  const [actorPermissions, targetRolePermissions] = await Promise.all([
    getEffectivePermissionKeys(
      actorMemberId,
      actorRoleId,
    ),
    prisma.rolePermission.findMany({
      where: {
        roleId: targetRoleId,
      },
      include: {
        permission: true,
      },
    }),
  ]);

  return targetRolePermissions.every((rolePermission) => {
    if (rolePermission.effect === "Deny") {
      return true;
    }

    return actorPermissions.has(
      rolePermission.permission.key,
    );
  });
}

async function validateRolePermissions(
  workspaceId: number,
  actorPermissions: Set<string>,
  permissionIds: number[],
) {
  if (permissionIds.length === 0) {
    return {
      valid: true,
      permissions: [],
    };
  }

  const uniquePermissionIds = [
    ...new Set(permissionIds),
  ];

  const permissions = await prisma.permission.findMany({
    where: {
      workspaceId,
      id: {
        in: uniquePermissionIds,
      },
    },
  });

  if (permissions.length !== uniquePermissionIds.length) {
    return {
      valid: false,
      message:
        "One or more permissions do not belong to this workspace.",
    };
  }

  const missingPermission = permissions.find(
    (permission) =>
      !actorPermissions.has(permission.key),
  );

  if (missingPermission) {
    return {
      valid: false,
      message:
        `You do not have permission to assign "${missingPermission.key}".`,
    };
  }

  return {
    valid: true,
    permissions,
  };
}

/*
|--------------------------------------------------------------------------
| GET MEMBERS
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    if (
      !hasPermission(
        await getEffectivePermissionKeys(
          member.id,
          member.roleId,
        ),
        "members.view",
      )
    ) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view members.",
      });
      return;
    }

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: member.workspaceId,
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
            updatedAt: true,
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
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("GET /api/members error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load workspace members.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER ROLE
|--------------------------------------------------------------------------
*/

router.patch("/:id/role", async (req, res) => {
  try {
    const actorUserId = getUserId(
      req as unknown as AuthenticatedRequest,
    );

    const actorMember = await getWorkspaceMember(
      actorUserId,
    );

    if (!actorMember) {
      res.status(403).json({
        success: false,
        message: "You do not belong to an active workspace.",
      });
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        actorMember.id,
        actorMember.roleId,
      );

    if (!hasPermission(actorPermissions, "members.update")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to update members.",
      });
      return;
    }

    const memberId = Number(req.params.id);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const targetMember =
      await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId: actorMember.workspaceId,
        },
        include: {
          user: true,
          role: true,
        },
      });

    if (!targetMember) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    const roleId = Number(req.body?.roleId);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid roleId is required.",
      });
      return;
    }

    const targetRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: actorMember.workspaceId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!targetRole) {
      res.status(404).json({
        success: false,
        message: "Role not found.",
      });
      return;
    }

    /*
     * Workspace owner protection.
     */
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: actorMember.workspaceId,
      },
    });

    if (!workspace) {
      res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
      return;
    }

    if (targetMember.userId === workspace.ownerId) {
      res.status(403).json({
        success: false,
        message:
          "The workspace owner's role cannot be changed.",
      });
      return;
    }

    /*
     * Only the workspace owner can assign Admin.
     */
    if (
      targetRole.name === "Admin" &&
      actorMember.userId !== workspace.ownerId
    ) {
      res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can assign the Admin role.",
      });
      return;
    }

    const allowed = await canAssignRole(
      actorMember.id,
      actorMember.roleId,
      targetRole.id,
    );

    if (!allowed) {
      res.status(403).json({
        success: false,
        message:
          "You cannot assign a role containing permissions you do not have.",
      });
      return;
    }

    const previousRole = targetMember.role.name;

    const updatedMember =
      await prisma.workspaceMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          roleId: targetRole.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
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
        },
      });

    await prisma.auditLog.create({
      data: {
        workspaceId: actorMember.workspaceId,
        actorId: actorUserId,
        memberId: targetMember.id,
        action:
          targetRole.name === "Admin"
            ? "Promoted"
            : previousRole === "Admin"
              ? "Demoted"
              : "Updated",
        entityType: "WorkspaceMember",
        entityId: String(targetMember.id),
        description:
          `Changed ${targetMember.user.email}'s role from ${previousRole} to ${targetRole.name}.`,
        metadata: {
          previousRole,
          newRole: targetRole.name,
          previousRoleId: targetMember.roleId,
          newRoleId: targetRole.id,
        },
      },
    });

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error(
      "PATCH /api/members/:id/role error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to update member role.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER STATUS
|--------------------------------------------------------------------------
*/

router.patch("/:id/status", async (req, res) => {
  try {
    const actorUserId = getUserId(
      req as unknown as AuthenticatedRequest,
    );

    const actorMember = await getWorkspaceMember(
      actorUserId,
    );

    if (!actorMember) {
      res.status(403).json({
        success: false,
        message: "You do not belong to an active workspace.",
      });
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        actorMember.id,
        actorMember.roleId,
      );

    if (!hasPermission(actorPermissions, "members.suspend")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to suspend members.",
      });
      return;
    }

    const memberId = Number(req.params.id);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const status = req.body?.status;

    if (
      status !== "Active" &&
      status !== "Suspended"
    ) {
      res.status(400).json({
        success: false,
        message:
          'Status must be either "Active" or "Suspended".',
      });
      return;
    }

    const targetMember =
      await prisma.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId: actorMember.workspaceId,
        },
        include: {
          user: true,
          role: true,
        },
      });

    if (!targetMember) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: actorMember.workspaceId,
      },
    });

    if (!workspace) {
      res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
      return;
    }

    /*
     * Workspace owner can never be suspended.
     */
    if (targetMember.userId === workspace.ownerId) {
      res.status(403).json({
        success: false,
        message:
          "The workspace owner cannot be suspended.",
      });
      return;
    }

    /*
     * Only the owner can suspend an Admin.
     */
    if (
      targetMember.role.name === "Admin" &&
      actorMember.userId !== workspace.ownerId
    ) {
      res.status(403).json({
        success: false,
        message:
          "Only the workspace owner can change an Admin's status.",
      });
      return;
    }

    const previousStatus = targetMember.status;

    const updatedMember =
      await prisma.workspaceMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          status,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
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
        },
      });

    await prisma.auditLog.create({
      data: {
        workspaceId: actorMember.workspaceId,
        actorId: actorUserId,
        memberId: targetMember.id,
        action:
          status === "Suspended"
            ? "Suspended"
            : "Restored",
        entityType: "WorkspaceMember",
        entityId: String(targetMember.id),
        description:
          `Changed ${targetMember.user.email}'s status from ${previousStatus} to ${status}.`,
        metadata: {
          previousStatus,
          newStatus: status,
        },
      },
    });

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error(
      "PATCH /api/members/:id/status error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to update member status.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER PERMISSION OVERRIDE
|--------------------------------------------------------------------------
*/

router.post("/:id/permissions", async (req, res) => {
  try {
    const actorUserId = getUserId(
      req as unknown as AuthenticatedRequest,
    );

    const actorMember = await getWorkspaceMember(
      actorUserId,
    );

    if (!actorMember) {
      res.status(403).json({
        success: false,
        message: "You do not belong to an active workspace.",
      });
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        actorMember.id,
        actorMember.roleId,
      );

    const targetMemberId = Number(req.params.id);

    if (
      !Number.isInteger(targetMemberId) ||
      targetMemberId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid member ID.",
      });
      return;
    }

    const targetMember =
      await prisma.workspaceMember.findFirst({
        where: {
          id: targetMemberId,
          workspaceId: actorMember.workspaceId,
        },
        include: {
          user: true,
        },
      });

    if (!targetMember) {
      res.status(404).json({
        success: false,
        message: "Member not found.",
      });
      return;
    }

    /*
     * Workspace owner cannot have permission overrides.
     */
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: actorMember.workspaceId,
      },
    });

    if (!workspace) {
      res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
      return;
    }

    if (targetMember.userId === workspace.ownerId) {
      res.status(403).json({
        success: false,
        message:
          "The workspace owner cannot have permission overrides.",
      });
      return;
    }

    const permissionId = Number(
      req.body?.permissionId,
    );

    const effect = req.body?.effect;

    if (
      !Number.isInteger(permissionId) ||
      permissionId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "A valid permissionId is required.",
      });
      return;
    }

    if (
      effect !== "Allow" &&
      effect !== "Deny"
    ) {
      res.status(400).json({
        success: false,
        message:
          'Effect must be either "Allow" or "Deny".',
      });
      return;
    }

    const permission =
      await prisma.permission.findFirst({
        where: {
          id: permissionId,
          workspaceId: actorMember.workspaceId,
        },
      });

    if (!permission) {
      res.status(404).json({
        success: false,
        message: "Permission not found.",
      });
      return;
    }

    /*
     * The actor cannot grant/revoke permissions
     * that they themselves do not possess.
     */
    if (!actorPermissions.has(permission.key)) {
      res.status(403).json({
        success: false,
        message:
          `You do not have permission to override "${permission.key}".`,
      });
      return;
    }

    const override =
      await prisma.memberPermission.upsert({
        where: {
          memberId_permissionId: {
            memberId: targetMember.id,
            permissionId: permission.id,
          },
        },
        create: {
          memberId: targetMember.id,
          permissionId: permission.id,
          effect,
          grantedById: actorUserId,
        },
        update: {
          effect,
          grantedById: actorUserId,
        },
        include: {
          permission: true,
        },
      });

    await prisma.auditLog.create({
      data: {
        workspaceId: actorMember.workspaceId,
        actorId: actorUserId,
        memberId: targetMember.id,
        action:
          effect === "Allow"
            ? "Granted"
            : "Revoked",
        entityType: "MemberPermission",
        entityId: String(override.id),
        description:
          `${effect === "Allow" ? "Granted" : "Denied"} ${permission.key} for ${targetMember.user.email}.`,
        metadata: {
          permissionId: permission.id,
          permissionKey: permission.key,
          effect,
        },
      },
    });

    res.json({
      success: true,
      data: override,
    });
  } catch (error) {
    console.error(
      "POST /api/members/:id/permissions error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update member permission.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ROLES
|--------------------------------------------------------------------------
*/

router.get("/roles", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const permissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (!hasPermission(permissions, "roles.view")) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view roles.",
      });
      return;
    }

    const roles = await prisma.role.findMany({
      where: {
        workspaceId: member.workspaceId,
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
      orderBy: [
        {
          isSystem: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error(
      "GET /api/members/roles error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to load roles.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE ROLE
|--------------------------------------------------------------------------
*/

router.post("/roles", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (!hasPermission(actorPermissions, "roles.create")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to create roles.",
      });
      return;
    }

    const name =
      typeof req.body?.name === "string"
        ? req.body.name.trim()
        : "";

    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Role name is required.",
      });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({
        success: false,
        message:
          "Role name must be 100 characters or less.",
      });
      return;
    }

    if (name.length < 2) {
      res.status(400).json({
        success: false,
        message:
          "Role name must contain at least 2 characters.",
      });
      return;
    }

    const existingRole = await prisma.role.findFirst({
      where: {
        workspaceId: member.workspaceId,
        name,
      },
    });

    if (existingRole) {
      res.status(409).json({
        success: false,
        message:
          "A role with this name already exists.",
      });
      return;
    }

    const permissionIds: unknown[] =
      Array.isArray(req.body?.permissionIds)
        ? req.body.permissionIds
        : [];

    if (
      !permissionIds.every(
        (id: unknown) =>
          typeof id === "number" &&
          Number.isInteger(id) &&
          id > 0,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "permissionIds must contain valid permission IDs.",
      });
      return;
    }

    const numericPermissionIds =
      permissionIds as number[];

    const validation =
      await validateRolePermissions(
        member.workspaceId,
        actorPermissions,
        numericPermissionIds,
      );

    if (!validation.valid) {
      res.status(403).json({
        success: false,
        message:
          validation.message ??
          "Invalid role permissions.",
      });
      return;
    }

    const role = await prisma.$transaction(
      async (tx) => {
        const createdRole = await tx.role.create({
          data: {
            workspaceId: member.workspaceId,
            name,
            description,
            isSystem: false,
            createdById: member.userId,
          },
        });

        if (numericPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: [
              ...new Set(numericPermissionIds),
            ].map((permissionId) => ({
              roleId: createdRole.id,
              permissionId,
              effect: "Allow" as const,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            workspaceId: member.workspaceId,
            actorId: member.userId,
            action: "RoleCreated",
            entityType: "Role",
            entityId: String(createdRole.id),
            description:
              `Created custom role "${name}".`,
            metadata: {
              roleName: name,
              permissionIds: numericPermissionIds,
            },
          },
        });

        return tx.role.findUnique({
          where: {
            id: createdRole.id,
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

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error(
      "POST /api/members/roles error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to create role.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE ROLE
|--------------------------------------------------------------------------
*/

router.patch("/roles/:id", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (!hasPermission(actorPermissions, "roles.update")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to update roles.",
      });
      return;
    }

    const roleId = Number(req.params.id);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
      return;
    }

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: member.workspaceId,
      },
      include: {
        rolePermissions: true,
      },
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: "Role not found.",
      });
      return;
    }

    if (role.isSystem) {
      res.status(403).json({
        success: false,
        message:
          "System roles cannot be modified.",
      });
      return;
    }

    const name =
      req.body?.name === undefined
        ? role.name
        : typeof req.body.name === "string"
          ? req.body.name.trim()
          : "";

    const description =
      req.body?.description === undefined
        ? role.description
        : typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Role name is required.",
      });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({
        success: false,
        message:
          "Role name must be 100 characters or less.",
      });
      return;
    }

    const duplicateRole = await prisma.role.findFirst({
      where: {
        workspaceId: member.workspaceId,
        name,
        NOT: {
          id: role.id,
        },
      },
    });

    if (duplicateRole) {
      res.status(409).json({
        success: false,
        message:
          "A role with this name already exists.",
      });
      return;
    }

    const permissionIds: unknown[] =
      req.body?.permissionIds === undefined
        ? role.rolePermissions.map(
            (entry) => entry.permissionId,
          )
        : Array.isArray(req.body.permissionIds)
          ? req.body.permissionIds
          : [];

    if (
      !permissionIds.every(
        (id: unknown) =>
          typeof id === "number" &&
          Number.isInteger(id) &&
          id > 0,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "permissionIds must contain valid permission IDs.",
      });
      return;
    }

    const numericPermissionIds =
      permissionIds as number[];

    const validation =
      await validateRolePermissions(
        member.workspaceId,
        actorPermissions,
        numericPermissionIds,
      );

    if (!validation.valid) {
      res.status(403).json({
        success: false,
        message:
          validation.message ??
          "Invalid role permissions.",
      });
      return;
    }

    const uniquePermissionIds = [
      ...new Set(numericPermissionIds),
    ];

    const updatedRole = await prisma.$transaction(
      async (tx) => {
        await tx.role.update({
          where: {
            id: role.id,
          },
          data: {
            name,
            description,
          },
        });

        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
          },
        });

        if (uniquePermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: uniquePermissionIds.map(
              (permissionId) => ({
                roleId: role.id,
                permissionId,
                effect: "Allow" as const,
              }),
            ),
          });
        }

        await tx.auditLog.create({
          data: {
            workspaceId: member.workspaceId,
            actorId: member.userId,
            action: "RoleUpdated",
            entityType: "Role",
            entityId: String(role.id),
            description:
              `Updated custom role "${name}".`,
            metadata: {
              previousName: role.name,
              newName: name,
              permissionIds: uniquePermissionIds,
            },
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

    res.json({
      success: true,
      data: updatedRole,
    });
  } catch (error) {
    console.error(
      "PATCH /api/members/roles/:id error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to update role.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE ROLE
|--------------------------------------------------------------------------
*/

router.delete("/roles/:id", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (!hasPermission(actorPermissions, "roles.delete")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete roles.",
      });
      return;
    }

    const roleId = Number(req.params.id);

    if (!Number.isInteger(roleId) || roleId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
      return;
    }

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: member.workspaceId,
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
      res.status(404).json({
        success: false,
        message: "Role not found.",
      });
      return;
    }

    if (role.isSystem) {
      res.status(403).json({
        success: false,
        message:
          "System roles cannot be deleted.",
      });
      return;
    }

    if (role._count.members > 0) {
      res.status(409).json({
        success: false,
        message:
          "This role cannot be deleted while members are assigned to it.",
      });
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.role.delete({
          where: {
            id: role.id,
          },
        });

        await tx.auditLog.create({
          data: {
            workspaceId: member.workspaceId,
            actorId: member.userId,
            action: "RoleDeleted",
            entityType: "Role",
            entityId: String(role.id),
            description:
              `Deleted custom role "${role.name}".`,
            metadata: {
              roleName: role.name,
            },
          },
        });
      },
    );

    res.json({
      success: true,
      message: "Role deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/members/roles/:id error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete role.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET PERMISSIONS
|--------------------------------------------------------------------------
*/

router.get("/permissions", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (
      !hasPermission(
        actorPermissions,
        "permissions.view",
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to view permissions.",
      });
      return;
    }

    const permissions =
      await prisma.permission.findMany({
        where: {
          workspaceId: member.workspaceId,
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

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error(
      "GET /api/members/permissions error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to load permissions.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET AUDIT LOGS
|--------------------------------------------------------------------------
*/

router.get("/audit", async (req, res) => {
  try {
    const member = await requireCurrentMember(req, res);

    if (!member) {
      return;
    }

    const actorPermissions =
      await getEffectivePermissionKeys(
        member.id,
        member.roleId,
      );

    if (!hasPermission(actorPermissions, "audit.view")) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to view audit logs.",
      });
      return;
    }

    const auditLogs =
      await prisma.auditLog.findMany({
        where: {
          workspaceId: member.workspaceId,
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
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      });

    res.json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    console.error(
      "GET /api/members/audit error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Failed to load audit logs.",
    });
  }
});

export default router;