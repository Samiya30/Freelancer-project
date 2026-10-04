import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";

import { prisma } from "../lib/prisma.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

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
      permissionOverrides: {
        include: {
          permission: true,
        },
      },
    },
  });
}

async function requireCurrentMember(req: Request, res: Response) {
  const userId = getUserId(
    req as unknown as AuthenticatedRequest,
  );

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
  const [actorPermissions, targetRolePermissions] =
    await Promise.all([
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

  if (
    permissions.length !==
    uniquePermissionIds.length
  ) {
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

function parsePermissionIds(
  value: unknown,
): number[] | null {
  if (!Array.isArray(value)) {
    return [];
  }

  if (
    !value.every(
      (id): id is number =>
        typeof id === "number" &&
        Number.isInteger(id) &&
        id > 0,
    )
  ) {
    return null;
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| WORKSPACE INVITATIONS
|--------------------------------------------------------------------------
*/

const INVITATION_EXPIRY_DAYS = 7;

function normalizeInvitationEmail(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function isValidInvitationEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function createInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

function hashInvitationToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function getInvitationExpiryDate(): Date {
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      INVITATION_EXPIRY_DAYS,
  );

  return expiresAt;
}

/*
|--------------------------------------------------------------------------
| PUBLIC — VALIDATE INVITATION TOKEN
|--------------------------------------------------------------------------
|
| This route intentionally appears before router.use(requireAuth).
| A newly invited user does not have a session yet.
|
*/

router.get(
  "/invitations/token/:token",
  async (req, res) => {
    try {
      const token = req.params.token?.trim();

      if (!token) {
        res.status(400).json({
          success: false,
          message: "Invitation token is required.",
        });

        return;
      }

      const tokenHash =
        hashInvitationToken(token);

      const invitation =
        await prisma.workspaceInvitation.findUnique({
          where: {
            tokenHash,
          },

          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
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

            invitedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

      if (!invitation) {
        res.status(404).json({
          success: false,
          message: "Invalid invitation.",
        });

        return;
      }

      if (invitation.status !== "Pending") {
        res.status(409).json({
          success: false,
          message:
            invitation.status === "Accepted"
              ? "This invitation has already been accepted."
              : invitation.status === "Revoked"
                ? "This invitation has been cancelled."
                : "This invitation has expired.",
        });

        return;
      }

      if (invitation.expiresAt <= new Date()) {
        await prisma.workspaceInvitation.update({
          where: {
            id: invitation.id,
          },

          data: {
            status: "Expired",
          },
        });

        res.status(410).json({
          success: false,
          message: "This invitation has expired.",
        });

        return;
      }

      res.json({
        success: true,

        data: {
          id: invitation.id,

          email: invitation.email,

          expiresAt: invitation.expiresAt,

          workspace: invitation.workspace,

          role: invitation.role,

          invitedBy: invitation.invitedBy,
        },
      });
    } catch (error) {
      console.error(
        "GET /api/members/invitations/token/:token error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to validate invitation.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| PUBLIC — ACCEPT INVITATION
|--------------------------------------------------------------------------
|
| This route is intentionally public.
| It creates the account, workspace membership and session.
|
*/

router.post(
  "/invitations/token/:token/accept",
  async (req, res) => {
    try {
      const token = req.params.token?.trim();

      if (!token) {
        res.status(400).json({
          success: false,
          message:
            "Invitation token is required.",
        });

        return;
      }

      const tokenHash =
        hashInvitationToken(token);

      const invitation =
        await prisma.workspaceInvitation.findUnique({
          where: {
            tokenHash,
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

      if (!invitation) {
        res.status(404).json({
          success: false,
          message: "Invalid invitation.",
        });

        return;
      }

      if (invitation.status !== "Pending") {
        res.status(409).json({
          success: false,
          message:
            invitation.status === "Accepted"
              ? "This invitation has already been accepted."
              : invitation.status === "Revoked"
                ? "This invitation has been cancelled."
                : "This invitation has expired.",
        });

        return;
      }

      if (invitation.expiresAt <= new Date()) {
        await prisma.workspaceInvitation.update({
          where: {
            id: invitation.id,
          },

          data: {
            status: "Expired",
          },
        });

        res.status(410).json({
          success: false,
          message:
            "This invitation has expired.",
        });

        return;
      }

      const name =
        typeof req.body?.name === "string"
          ? req.body.name.trim()
          : "";

      const password =
        typeof req.body?.password === "string"
          ? req.body.password
          : "";

      if (!name) {
        res.status(400).json({
          success: false,
          message: "Name is required.",
        });

        return;
      }

      if (name.length < 2) {
        res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters.",
        });

        return;
      }

      if (name.length > 100) {
        res.status(400).json({
          success: false,
          message:
            "Name must be 100 characters or less.",
        });

        return;
      }

      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message:
            "Password must contain at least 8 characters.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK EXISTING USER
      |--------------------------------------------------------------------------
      */

      const existingUser =
        await prisma.user.findUnique({
          where: {
            email:
              invitation.email,
          },
        });

      /*
      |--------------------------------------------------------------------------
      | EXISTING ACCOUNT CANNOT USE THIS
      | ENDPOINT WITH A NEW PASSWORD
      |--------------------------------------------------------------------------
      */

      if (existingUser) {
        res.status(409).json({
          success: false,
          code: "ACCOUNT_EXISTS",
          message:
            "An account already exists with this email. Please sign in to accept the invitation.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | HASH PASSWORD
      |--------------------------------------------------------------------------
      */

      const bcrypt =
        await import("bcryptjs");

      const passwordHash =
        await bcrypt.hash(
          password,
          12,
        );

      /*
      |--------------------------------------------------------------------------
      | ACCEPT INVITATION TRANSACTIONALLY
      |--------------------------------------------------------------------------
      */

      const result =
        await prisma.$transaction(
          async (tx) => {
            /*
            |--------------------------------------------------------------------------
            | CREATE USER
            |--------------------------------------------------------------------------
            */

            const user =
              await tx.user.create({
                data: {
                  name,

                  email:
                    invitation.email,

                  password:
                    passwordHash,

                  firstName:
                    name.split(" ")[0] ?? "",

                  lastName:
                    name
                      .split(" ")
                      .slice(1)
                      .join(" "),

                  role:
                    invitation.role.name,
                },
              });

            /*
            |--------------------------------------------------------------------------
            | CREATE SETTINGS
            |--------------------------------------------------------------------------
            */

            await tx.settings.create({
              data: {
                userId:
                  user.id,
              },
            });

            /*
            |--------------------------------------------------------------------------
            | CREATE WORKSPACE MEMBERSHIP
            |--------------------------------------------------------------------------
            */

            const workspaceMember =
              await tx.workspaceMember.create({
                data: {
                  workspaceId:
                    invitation.workspaceId,

                  userId:
                    user.id,

                  roleId:
                    invitation.roleId,

                  status:
                    "Active",
                },

                include: {
                  role: true,
                },
              });

            /*
            |--------------------------------------------------------------------------
            | MARK INVITATION ACCEPTED
            |--------------------------------------------------------------------------
            */

            const acceptedInvitation =
              await tx.workspaceInvitation.update({
                where: {
                  id:
                    invitation.id,
                },

                data: {
                  status:
                    "Accepted",

                  acceptedById:
                    user.id,

                  acceptedAt:
                    new Date(),
                },
              });

            /*
            |--------------------------------------------------------------------------
            | AUDIT LOG
            |--------------------------------------------------------------------------
            */

            await tx.auditLog.create({
              data: {
                workspaceId:
                  invitation.workspaceId,

                actorId:
                  user.id,

                memberId:
                  workspaceMember.id,

                action:
                  "Updated",

                entityType:
                  "WorkspaceInvitation",

                entityId:
                  String(
                    invitation.id,
                  ),

                description:
                  `${user.email} accepted the workspace invitation.`,

                metadata: {
                  invitationId:
                    invitation.id,

                  email:
                    user.email,

                  roleId:
                    invitation.roleId,

                  roleName:
                    invitation.role.name,
                },
              },
            });

            return {
              user,

              workspaceMember,

              acceptedInvitation,
            };
          },
        );

      /*
      |--------------------------------------------------------------------------
      | CREATE SESSION
      |--------------------------------------------------------------------------
      */

      const {
        createSession,
        getSessionCookieName,
        getSessionCookieOptions,
      } = await import(
        "../lib/auth.js"
      );

      const session =
        await createSession(
          result.user.id,
        );

      res.cookie(
        getSessionCookieName(),
        session.id,
        getSessionCookieOptions(),
      );

      /*
      |--------------------------------------------------------------------------
      | BUILD AUTHORIZATION RESPONSE
      |--------------------------------------------------------------------------
      */

      const effectivePermissions =
        await getEffectivePermissionKeys(
          result.workspaceMember.id,
          result.workspaceMember.roleId,
        );

      res.status(201).json({
        success: true,

        message:
          "Invitation accepted successfully.",

        data: {
          user: {
            id:
              result.user.id,

            name:
              result.user.name,

            email:
              result.user.email,

            firstName:
              result.user.firstName,

            lastName:
              result.user.lastName,

            role:
              result.user.role,
          },

          workspace: {
            id:
              invitation.workspace.id,

            name:
              invitation.workspace.name,

            slug:
              invitation.workspace.slug,
          },

          membership: {
            id:
              result.workspaceMember.id,

            roleId:
              result.workspaceMember.roleId,

            roleName:
              result.workspaceMember.role.name,

            status:
              result.workspaceMember.status,
          },

          authorization: {
            workspaceId:
              invitation.workspaceId,

            workspaceName:
              invitation.workspace.name,

            memberId:
              result.workspaceMember.id,

            roleId:
              result.workspaceMember.roleId,

            roleName:
              result.workspaceMember.role.name,

            status:
              result.workspaceMember.status,

            permissions:
              [
                ...effectivePermissions,
              ].sort(),
          },
        },
      });
    } catch (error) {
      console.error(
        "POST /api/members/invitations/token/:token/accept error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to accept workspace invitation.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| ALL ROUTES BELOW THIS POINT REQUIRE AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(requireAuth);

/*
|--------------------------------------------------------------------------
| CREATE INVITATION
|--------------------------------------------------------------------------
*/

router.post(
  "/invitations",
  async (req, res) => {
    try {
      const actorUserId = getUserId(
        req as unknown as AuthenticatedRequest,
      );

      const actorMember =
        await getWorkspaceMember(
          actorUserId,
        );

      if (!actorMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not belong to an active workspace.",
        });

        return;
      }

      const actorPermissions =
        await getEffectivePermissionKeys(
          actorMember.id,
          actorMember.roleId,
        );

      if (
        !hasPermission(
          actorPermissions,
          "members.invite",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to invite members.",
        });

        return;
      }

      const email =
        normalizeInvitationEmail(
          req.body?.email,
        );

      const roleId = Number(
        req.body?.roleId,
      );

      if (
        !email ||
        !isValidInvitationEmail(email)
      ) {
        res.status(400).json({
          success: false,
          message:
            "A valid email address is required.",
        });

        return;
      }

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "A valid roleId is required.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY ROLE BELONGS TO CURRENT WORKSPACE
      |--------------------------------------------------------------------------
      */

      const targetRole =
        await prisma.role.findFirst({
          where: {
            id: roleId,
            workspaceId:
              actorMember.workspaceId,
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
          message:
            "Role not found in this workspace.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | ACTOR CANNOT INVITE WITH PERMISSIONS
      | THEY THEMSELVES DO NOT HAVE
      |--------------------------------------------------------------------------
      */

      const allowed =
        await canAssignRole(
          actorMember.id,
          actorMember.roleId,
          targetRole.id,
        );

      if (!allowed) {
        res.status(403).json({
          success: false,
          message:
            "You cannot invite a member with a role containing permissions you do not have.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY WORKSPACE
      |--------------------------------------------------------------------------
      */

      const workspace =
        await prisma.workspace.findUnique({
          where: {
            id: actorMember.workspaceId,
          },

          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
          },
        });

      if (!workspace) {
        res.status(404).json({
          success: false,
          message:
            "Workspace not found.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | PREVENT INVITING EXISTING MEMBER
      |--------------------------------------------------------------------------
      */

      const existingUser =
        await prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
            email: true,
          },
        });

      if (existingUser) {
        const existingMembership =
          await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId:
                  actorMember.workspaceId,

                userId:
                  existingUser.id,
              },
            },
          });

        if (existingMembership) {
          res.status(409).json({
            success: false,
            message:
              "This user is already a member of this workspace.",
          });

          return;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK EXISTING PENDING INVITATION
      |--------------------------------------------------------------------------
      */

      const now = new Date();

      const pendingInvitation =
        await prisma.workspaceInvitation.findFirst({
          where: {
            workspaceId:
              actorMember.workspaceId,

            email,

            status: "Pending",
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      if (
        pendingInvitation &&
        pendingInvitation.expiresAt > now
      ) {
        res.status(409).json({
          success: false,
          message:
            "A pending invitation already exists for this email address.",
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | MARK OLD INVITATION EXPIRED
      |--------------------------------------------------------------------------
      */

      if (pendingInvitation) {
        await prisma.workspaceInvitation.update({
          where: {
            id:
              pendingInvitation.id,
          },

          data: {
            status:
              "Expired",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE SECURE TOKEN
      |--------------------------------------------------------------------------
      */

      const rawToken =
        createInvitationToken();

      const tokenHash =
        hashInvitationToken(
          rawToken,
        );

      const expiresAt =
        getInvitationExpiryDate();

      /*
      |--------------------------------------------------------------------------
      | CREATE INVITATION + AUDIT LOG
      |--------------------------------------------------------------------------
      */

      const invitation =
        await prisma.$transaction(
          async (tx) => {
            const createdInvitation =
              await tx.workspaceInvitation.create({
                data: {
                  workspaceId:
                    actorMember.workspaceId,

                  email,

                  roleId:
                    targetRole.id,

                  tokenHash,

                  status:
                    "Pending",

                  expiresAt,

                  invitedById:
                    actorUserId,
                },

                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      isSystem: true,
                    },
                  },

                  workspace: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },

                  invitedBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              });

            await tx.auditLog.create({
              data: {
                workspaceId:
                  actorMember.workspaceId,

                actorId:
                  actorUserId,

                action:
                  "Invited",

                entityType:
                  "WorkspaceInvitation",

                entityId:
                  String(
                    createdInvitation.id,
                  ),

                description:
                  `Invited ${email} to join the workspace as ${targetRole.name}.`,

                metadata: {
                  invitationId:
                    createdInvitation.id,

                  email,

                  roleId:
                    targetRole.id,

                  roleName:
                    targetRole.name,

                  expiresAt:
                    expiresAt.toISOString(),
                },
              },
            });

            return createdInvitation;
          },
        );

      /*
      |--------------------------------------------------------------------------
      | CREATE FRONTEND INVITATION URL
      |--------------------------------------------------------------------------
      */

      const frontendUrl = (
        process.env.FRONTEND_URL ||
        "http://localhost:3000"
      ).replace(
        /\/$/,
        "",
      );

      const invitationUrl =
        `${frontendUrl}/invite/${rawToken}`;

      /*
      |--------------------------------------------------------------------------
      | RETURN INVITATION
      |--------------------------------------------------------------------------
      */

      res.status(201).json({
        success: true,

        message:
          "Workspace invitation created successfully.",

        data: {
          id:
            invitation.id,

          email:
            invitation.email,

          status:
            invitation.status,

          expiresAt:
            invitation.expiresAt,

          role:
            invitation.role,

          workspace:
            invitation.workspace,

          invitedBy:
            invitation.invitedBy,

          invitationUrl,
        },
      });
    } catch (error) {
      console.error(
        "POST /api/members/invitations error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to create workspace invitation.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET INVITATIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/invitations",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

      if (!member) {
        return;
      }

      const permissions =
        await getEffectivePermissionKeys(
          member.id,
          member.roleId,
        );

      if (
        !hasPermission(
          permissions,
          "members.view",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to view workspace invitations.",
        });

        return;
      }

      await prisma.workspaceInvitation.updateMany({
        where: {
          workspaceId:
            member.workspaceId,

          status:
            "Pending",

          expiresAt: {
            lte: new Date(),
          },
        },

        data: {
          status:
            "Expired",
        },
      });

      const invitations =
        await prisma.workspaceInvitation.findMany({
          where: {
            workspaceId:
              member.workspaceId,
          },

          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isSystem: true,
              },
            },

            invitedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            acceptedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      /*
      |--------------------------------------------------------------------------
      | NEVER RETURN TOKEN HASH
      |--------------------------------------------------------------------------
      */

      const safeInvitations =
        invitations.map(
          (invitation) => ({
            id:
              invitation.id,

            email:
              invitation.email,

            status:
              invitation.status,

            expiresAt:
              invitation.expiresAt,

            acceptedAt:
              invitation.acceptedAt,

            revokedAt:
              invitation.revokedAt,

            createdAt:
              invitation.createdAt,

            updatedAt:
              invitation.updatedAt,

            role:
              invitation.role,

            invitedBy:
              invitation.invitedBy,

            acceptedBy:
              invitation.acceptedBy,
          }),
        );

      res.json({
        success: true,
        data:
          safeInvitations,
      });
    } catch (error) {
      console.error(
        "GET /api/members/invitations error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load workspace invitations.",
      });
    }
  },
);
/*
|--------------------------------------------------------------------------
| CANCEL INVITATION
|--------------------------------------------------------------------------
*/

router.delete(
  "/invitations/:id",
  async (req, res) => {
    try {
      const actorUserId =
        getUserId(
          req as unknown as AuthenticatedRequest,
        );

      const actorMember =
        await getWorkspaceMember(
          actorUserId,
        );

      if (!actorMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not belong to an active workspace.",
        });

        return;
      }

      const actorPermissions =
        await getEffectivePermissionKeys(
          actorMember.id,
          actorMember.roleId,
        );

      if (
        !hasPermission(
          actorPermissions,
          "members.invite",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to manage workspace invitations.",
        });

        return;
      }

      const invitationId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          invitationId,
        ) ||
        invitationId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid invitation ID.",
        });

        return;
      }

      const invitation =
        await prisma.workspaceInvitation.findFirst({
          where: {
            id:
              invitationId,

            workspaceId:
              actorMember.workspaceId,
          },

          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      if (!invitation) {
        res.status(404).json({
          success: false,
          message:
            "Invitation not found.",
        });

        return;
      }

      if (
        invitation.status !==
        "Pending"
      ) {
        res.status(409).json({
          success: false,
          message:
            "Only pending invitations can be cancelled.",
        });

        return;
      }

      const revoked =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.workspaceInvitation.update({
                where: {
                  id:
                    invitation.id,
                },

                data: {
                  status:
                    "Revoked",

                  revokedAt:
                    new Date(),
                },

                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });

            await tx.auditLog.create({
              data: {
                workspaceId:
                  actorMember.workspaceId,

                actorId:
                  actorUserId,

                action:
                  "Updated",

                entityType:
                  "WorkspaceInvitation",

                entityId:
                  String(
                    invitation.id,
                  ),

                description:
                  `Cancelled invitation for ${invitation.email}.`,

                metadata: {
                  invitationId:
                    invitation.id,

                  email:
                    invitation.email,

                  roleId:
                    invitation.role.id,

                  roleName:
                    invitation.role.name,

                  previousStatus:
                    invitation.status,

                  newStatus:
                    "Revoked",
                },
              },
            });

            return updated;
          },
        );

      res.json({
        success: true,

        message:
          "Workspace invitation cancelled successfully.",

        data: {
          id:
            revoked.id,

          email:
            invitation.email,

          status:
            revoked.status,

          revokedAt:
            revoked.revokedAt,
        },
      });
    } catch (error) {
      console.error(
        "DELETE /api/members/invitations/:id error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to cancel workspace invitation.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET MEMBERS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

      if (!member) {
        return;
      }

      const permissions =
        await getEffectivePermissionKeys(
          member.id,
          member.roleId,
        );

      if (
        !hasPermission(
          permissions,
          "members.view",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to view members.",
        });

        return;
      }

      const members =
        await prisma.workspaceMember.findMany({
          where: {
            workspaceId:
              member.workspaceId,
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
        data:
          members,
      });
    } catch (error) {
      console.error(
        "GET /api/members error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load workspace members.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER ROLE
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/role",
  async (req, res) => {
    try {
      const actorUserId =
        getUserId(
          req as unknown as AuthenticatedRequest,
        );

      const actorMember =
        await getWorkspaceMember(
          actorUserId,
        );

      if (!actorMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not belong to an active workspace.",
        });

        return;
      }

      const actorPermissions =
        await getEffectivePermissionKeys(
          actorMember.id,
          actorMember.roleId,
        );

      if (
        !hasPermission(
          actorPermissions,
          "members.update",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to update members.",
        });

        return;
      }

      const memberId =
        Number(req.params.id);

      if (
        !Number.isInteger(memberId) ||
        memberId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID.",
        });

        return;
      }

      const targetMember =
        await prisma.workspaceMember.findFirst({
          where: {
            id:
              memberId,

            workspaceId:
              actorMember.workspaceId,
          },

          include: {
            user: true,
            role: true,
          },
        });

      if (!targetMember) {
        res.status(404).json({
          success: false,
          message:
            "Member not found.",
        });

        return;
      }

      const roleId =
        Number(req.body?.roleId);

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "A valid roleId is required.",
        });

        return;
      }

      const targetRole =
        await prisma.role.findFirst({
          where: {
            id:
              roleId,

            workspaceId:
              actorMember.workspaceId,
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
          message:
            "Role not found.",
        });

        return;
      }

      const workspace =
        await prisma.workspace.findUnique({
          where: {
            id:
              actorMember.workspaceId,
          },
        });

      if (!workspace) {
        res.status(404).json({
          success: false,
          message:
            "Workspace not found.",
        });

        return;
      }

      if (
        targetMember.userId ===
        workspace.ownerId
      ) {
        res.status(403).json({
          success: false,
          message:
            "The workspace owner's role cannot be changed.",
        });

        return;
      }

      if (
        targetRole.name === "Admin" &&
        actorMember.userId !==
          workspace.ownerId
      ) {
        res.status(403).json({
          success: false,
          message:
            "Only the workspace owner can assign the Admin role.",
        });

        return;
      }

      const allowed =
        await canAssignRole(
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

      const previousRole =
        targetMember.role.name;

      const updatedMember =
        await prisma.workspaceMember.update({
          where: {
            id:
              targetMember.id,
          },

          data: {
            roleId:
              targetRole.id,
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
          workspaceId:
            actorMember.workspaceId,

          actorId:
            actorUserId,

          memberId:
            targetMember.id,

          action:
            targetRole.name === "Admin"
              ? "Promoted"
              : previousRole === "Admin"
                ? "Demoted"
                : "Updated",

          entityType:
            "WorkspaceMember",

          entityId:
            String(
              targetMember.id,
            ),

          description:
            `Changed ${targetMember.user.email}'s role from ${previousRole} to ${targetRole.name}.`,

          metadata: {
            previousRole,

            newRole:
              targetRole.name,

            previousRoleId:
              targetMember.roleId,

            newRoleId:
              targetRole.id,
          },
        },
      });

      res.json({
        success: true,
        data:
          updatedMember,
      });
    } catch (error) {
      console.error(
        "PATCH /api/members/:id/role error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update member role.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE MEMBER STATUS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/status",
  async (req, res) => {
    try {
      const actorUserId =
        getUserId(
          req as unknown as AuthenticatedRequest,
        );

      const actorMember =
        await getWorkspaceMember(
          actorUserId,
        );

      if (!actorMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not belong to an active workspace.",
        });

        return;
      }

      const actorPermissions =
        await getEffectivePermissionKeys(
          actorMember.id,
          actorMember.roleId,
        );

      if (
        !hasPermission(
          actorPermissions,
          "members.suspend",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to suspend members.",
        });

        return;
      }

      const memberId =
        Number(req.params.id);

      if (
        !Number.isInteger(memberId) ||
        memberId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID.",
        });

        return;
      }

      const status =
        req.body?.status;

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
            id:
              memberId,

            workspaceId:
              actorMember.workspaceId,
          },

          include: {
            user: true,
            role: true,
          },
        });

      if (!targetMember) {
        res.status(404).json({
          success: false,
          message:
            "Member not found.",
        });

        return;
      }

      const workspace =
        await prisma.workspace.findUnique({
          where: {
            id:
              actorMember.workspaceId,
          },
        });

      if (!workspace) {
        res.status(404).json({
          success: false,
          message:
            "Workspace not found.",
        });

        return;
      }

      if (
        targetMember.userId ===
        workspace.ownerId
      ) {
        res.status(403).json({
          success: false,
          message:
            "The workspace owner cannot be suspended.",
        });

        return;
      }

      if (
        targetMember.role.name ===
          "Admin" &&
        actorMember.userId !==
          workspace.ownerId
      ) {
        res.status(403).json({
          success: false,
          message:
            "Only the workspace owner can change an Admin's status.",
        });

        return;
      }

      const previousStatus =
        targetMember.status;

      const updatedMember =
        await prisma.workspaceMember.update({
          where: {
            id:
              targetMember.id,
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
          workspaceId:
            actorMember.workspaceId,

          actorId:
            actorUserId,

          memberId:
            targetMember.id,

          action:
            status === "Suspended"
              ? "Suspended"
              : "Restored",

          entityType:
            "WorkspaceMember",

          entityId:
            String(
              targetMember.id,
            ),

          description:
            `${targetMember.user.email} was ${status === "Suspended" ? "suspended" : "reactivated"}.`,

          metadata: {
            previousStatus,

            newStatus:
              status,
          },
        },
      });

      res.json({
        success: true,
        data:
          updatedMember,
      });
    } catch (error) {
      console.error(
        "PATCH /api/members/:id/status error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update member status.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE ROLE
|--------------------------------------------------------------------------
*/

router.patch(
  "/roles/:id",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

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
          "roles.update",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to update roles.",
        });

        return;
      }

      const roleId =
        Number(req.params.id);

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid role ID.",
        });

        return;
      }

      const existingRole =
        await prisma.role.findFirst({
          where: {
            id:
              roleId,

            workspaceId:
              member.workspaceId,
          },

          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        });

      if (!existingRole) {
        res.status(404).json({
          success: false,
          message:
            "Role not found.",
        });

        return;
      }

      if (existingRole.isSystem) {
        res.status(403).json({
          success: false,
          message:
            "System roles cannot be modified.",
        });

        return;
      }

      const name =
        typeof req.body?.name ===
        "string"
          ? req.body.name.trim()
          : existingRole.name;

      const description =
        typeof req.body?.description ===
        "string"
          ? req.body.description.trim()
          : existingRole.description;

      if (
        !name ||
        name.length < 2
      ) {
        res.status(400).json({
          success: false,
          message:
            "Role name must contain at least 2 characters.",
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

      const duplicateRole =
        await prisma.role.findFirst({
          where: {
            workspaceId:
              member.workspaceId,

            name,

            NOT: {
              id:
                existingRole.id,
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

      const numericPermissionIds =
        req.body?.permissionIds ===
        undefined
          ? existingRole.rolePermissions.map(
              (rolePermission) =>
                rolePermission.permissionId,
            )
          : parsePermissionIds(
              req.body.permissionIds,
            );

      if (
        numericPermissionIds ===
        null
      ) {
        res.status(400).json({
          success: false,
          message:
            "permissionIds must contain valid permission IDs.",
        });

        return;
      }

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

      const updatedRole =
        await prisma.$transaction(
          async (tx) => {
            const role =
              await tx.role.update({
                where: {
                  id:
                    existingRole.id,
                },

                data: {
                  name,

                  description,
                },
              });

            await tx.rolePermission.deleteMany({
              where: {
                roleId:
                  existingRole.id,
              },
            });

            if (
              numericPermissionIds.length >
              0
            ) {
              await tx.rolePermission.createMany(
                {
                  data: [
                    ...new Set(
                      numericPermissionIds,
                    ),
                  ].map(
                    (
                      permissionId,
                    ) => ({
                      roleId:
                        existingRole.id,

                      permissionId,

                      effect:
                        "Allow" as const,
                    }),
                  ),
                },
              );
            }

            await tx.auditLog.create({
              data: {
                workspaceId:
                  member.workspaceId,

                actorId:
                  member.userId,

                action:
                  "RoleUpdated",

                entityType:
                  "Role",

                entityId:
                  String(
                    existingRole.id,
                  ),

                description:
                  `Updated custom role "${existingRole.name}".`,

                metadata: {
                  previousName:
                    existingRole.name,

                  newName:
                    name,

                  previousPermissionIds:
                    existingRole.rolePermissions.map(
                      (
                        rolePermission,
                      ) =>
                        rolePermission.permissionId,
                    ),

                  newPermissionIds:
                    numericPermissionIds,
                },
              },
            });

            return tx.role.findUniqueOrThrow({
              where: {
                id:
                  role.id,
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
        data:
          updatedRole,
      });
    } catch (error) {
      console.error(
        "PATCH /api/members/roles/:id error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update role.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| DELETE ROLE
|--------------------------------------------------------------------------
*/

router.delete(
  "/roles/:id",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

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
          "roles.delete",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to delete roles.",
        });

        return;
      }

      const roleId =
        Number(req.params.id);

      if (
        !Number.isInteger(roleId) ||
        roleId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid role ID.",
        });

        return;
      }

      const role =
        await prisma.role.findFirst({
          where: {
            id:
              roleId,

            workspaceId:
              member.workspaceId,
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
          message:
            "Role not found.",
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
            "This role is assigned to members and cannot be deleted until those members are reassigned.",
        });

        return;
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.role.delete({
            where: {
              id:
                role.id,
            },
          });

          await tx.auditLog.create({
            data: {
              workspaceId:
                member.workspaceId,

              actorId:
                member.userId,

              action:
                "RoleDeleted",

              entityType:
                "Role",

              entityId:
                String(
                  role.id,
                ),

              description:
                `Deleted custom role "${role.name}".`,

              metadata: {
                roleName:
                  role.name,
              },
            },
          });
        },
      );

      res.json({
        success: true,
        message:
          "Role deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/members/roles/:id error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete role.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET PERMISSIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/permissions",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

      if (!member) {
        return;
      }

      const permissions =
        await getEffectivePermissionKeys(
          member.id,
          member.roleId,
        );

      if (
        !hasPermission(
          permissions,
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

      const permissionRecords =
        await prisma.permission.findMany({
          where: {
            workspaceId:
              member.workspaceId,
          },

          orderBy: {
            key:
              "asc",
          },
        });

      res.json({
        success: true,
        data:
          permissionRecords,
      });
    } catch (error) {
      console.error(
        "GET /api/members/permissions error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load permissions.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| GET MEMBER PERMISSION OVERRIDES
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/permissions",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

      if (!member) {
        return;
      }

      const permissions =
        await getEffectivePermissionKeys(
          member.id,
          member.roleId,
        );

      if (
        !hasPermission(
          permissions,
          "permissions.view",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to view member permissions.",
        });

        return;
      }

      const targetMemberId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          targetMemberId,
        ) ||
        targetMemberId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID.",
        });

        return;
      }

      const targetMember =
        await prisma.workspaceMember.findFirst({
          where: {
            id:
              targetMemberId,

            workspaceId:
              member.workspaceId,
          },

          include: {
            permissionOverrides: {
              include: {
                permission: true,
                grantedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

      if (!targetMember) {
        res.status(404).json({
          success: false,
          message:
            "Member not found.",
        });

        return;
      }

      res.json({
        success: true,
        data:
          targetMember.permissionOverrides,
      });
    } catch (error) {
      console.error(
        "GET /api/members/:id/permissions error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load member permission overrides.",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| DELETE MEMBER PERMISSION OVERRIDE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id/permissions/:permissionId",
  async (req, res) => {
    try {
      const actorUserId =
        getUserId(
          req as unknown as AuthenticatedRequest,
        );

      const actorMember =
        await getWorkspaceMember(
          actorUserId,
        );

      if (!actorMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not belong to an active workspace.",
        });

        return;
      }

      const actorPermissions =
        await getEffectivePermissionKeys(
          actorMember.id,
          actorMember.roleId,
        );

      if (
        !hasPermission(
          actorPermissions,
          "permissions.revoke",
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to revoke permissions.",
        });

        return;
      }

      const targetMemberId =
        Number(req.params.id);

      const permissionId =
        Number(
          req.params.permissionId,
        );

      if (
        !Number.isInteger(
          targetMemberId,
        ) ||
        targetMemberId <= 0 ||
        !Number.isInteger(
          permissionId,
        ) ||
        permissionId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID or permission ID.",
        });

        return;
      }

      const targetMember =
        await prisma.workspaceMember.findFirst({
          where: {
            id:
              targetMemberId,

            workspaceId:
              actorMember.workspaceId,
          },

          include: {
            user: true,
          },
        });

      if (!targetMember) {
        res.status(404).json({
          success: false,
          message:
            "Member not found.",
        });

        return;
      }

      const override =
        await prisma.memberPermission.findFirst({
          where: {
            memberId:
              targetMember.id,

            permissionId,
          },

          include: {
            permission: true,
          },
        });

      if (!override) {
        res.status(404).json({
          success: false,
          message:
            "Permission override not found.",
        });

        return;
      }

      if (
        !actorPermissions.has(
          override.permission.key,
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            `You do not have permission to override "${override.permission.key}".`,
        });

        return;
      }

      await prisma.memberPermission.delete({
        where: {
          memberId_permissionId: {
            memberId:
              targetMember.id,

            permissionId:
              override.permissionId,
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          workspaceId:
            actorMember.workspaceId,

          actorId:
            actorUserId,

          memberId:
            targetMember.id,

          action:
            "Revoked",

          entityType:
            "MemberPermission",

          entityId:
            String(
              override.id,
            ),

          description:
            `Removed permission override "${override.permission.key}" from ${targetMember.user.email}.`,

          metadata: {
            permissionId:
              override.permissionId,

            permissionKey:
              override.permission.key,

            previousEffect:
              override.effect,
          },
        },
      });

      res.json({
        success: true,
        message:
          "Permission override removed successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/members/:id/permissions/:permissionId error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to remove member permission override.",
      });
    }
  },
);
/*
|--------------------------------------------------------------------------
| GET AUDIT LOGS
|--------------------------------------------------------------------------
*/

router.get(
  "/audit",
  async (req, res) => {
    try {
      const member =
        await requireCurrentMember(
          req,
          res,
        );

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
          "audit.view",
        )
      ) {
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
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 200,
        });

      res.json({
        success: true,
        data:
          auditLogs,
      });
    } catch (error) {
      console.error(
        "GET /api/members/audit error:",
        error,
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load audit logs.",
      });
    }
  },
);

export default router;