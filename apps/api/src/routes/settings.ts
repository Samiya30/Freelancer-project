import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getAuthorizationContext } from "../middleware/permissions.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

const settingsSchema = z.object({
  profile: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string(),
    email: z.string().trim().email(),
    phone: z.string(),
    /*
     * Kept for frontend compatibility.
     *
     * IMPORTANT:
     * This value is never used to change authorization.
     * RBAC role changes must go through /api/members/:id/role.
     */
    role: z.string().optional(),
    bio: z.string(),
  }),

  workspace: z.object({
    name: z.string().trim().min(1).max(200),
    website: z.string().max(500),
    industry: z.string().max(200),
    timezone: z.string().max(100),
    currency: z.string().max(20),
  }),

  notifications: z.object({
    email: z.boolean(),
    projects: z.boolean(),
    invoices: z.boolean(),
    tasks: z.boolean(),
    weekly: z.boolean(),
    marketing: z.boolean(),
  }),

  appearance: z.enum(["light", "dark", "system"]),
});

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

async function getCurrentWorkspace(userId: number) {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      status: "Active",
    },
    include: {
      workspace: true,
      role: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return member;
}

async function getOrCreateSettings(userId: number) {
  return prisma.settings.upsert({
    where: {
      userId,
    },
    update: {},
    create: {
      userId,
      workspaceName: "FreelanceOS Workspace",
      website: "",
      industry: "Technology",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });
}

/**
 * GET /api/settings
 *
 * Requires:
 * - Authentication
 * - settings.view
 *
 * Returns the effective RBAC role rather than the legacy
 * User.role field.
 */
router.get(
  "/",
  requirePermission("settings.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const member = await getCurrentWorkspace(userId);

      if (!member) {
        return res.status(403).json({
          success: false,
          message: "Active workspace membership not found.",
        });
      }

      const settings = await getOrCreateSettings(userId);

      const authorization =
        await getAuthorizationContext(userId);

      if (!authorization) {
        return res.status(403).json({
          success: false,
          message:
            "Authorization context could not be loaded.",
        });
      }

      const firstName =
        user.firstName ||
        user.name.split(" ")[0] ||
        "";

      const lastName =
        user.lastName ||
        user.name.split(" ").slice(1).join(" ") ||
        "";

      return res.json({
        success: true,
        data: {
          profile: {
            firstName,
            lastName,
            email: user.email,
            phone: user.phone,

            /*
             * RBAC is authoritative.
             * Do not expose User.role as the current role.
             */
            role: authorization.roleName,

            bio: user.bio,
          },

          workspace: {
            /*
             * Workspace.name is the authoritative workspace name.
             */
            name: member.workspace.name,
            website: settings.website,
            industry: settings.industry,
            timezone: settings.timezone,
            currency: settings.currency,
          },

          notifications: {
            email: settings.notificationEmail,
            projects: settings.notificationProjects,
            invoices: settings.notificationInvoices,
            tasks: settings.notificationTasks,
            weekly: settings.notificationWeekly,
            marketing: settings.notificationMarketing,
          },

          appearance: settings.appearance,

          authorization: {
            workspaceId: authorization.workspaceId,
            workspaceName: authorization.workspaceName,
            memberId: authorization.memberId,
            roleId: authorization.roleId,
            roleName: authorization.roleName,
            status: authorization.status,
            permissions: authorization.permissions,
          },
        },
      });
    } catch (error) {
      console.error(
        "GET /api/settings error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load settings.",
      });
    }
  },
);

/**
 * PATCH /api/settings
 *
 * Requires:
 * - Authentication
 * - settings.update
 *
 * IMPORTANT:
 * profile.role is accepted for backwards frontend compatibility
 * but is deliberately ignored.
 *
 * Role changes belong to the RBAC members API.
 */
router.patch(
  "/",
  requirePermission("settings.update"),
  async (req, res) => {
    try {
      const parsed =
        settingsSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid settings data.",
          errors: parsed.error.flatten(),
        });
      }

      const {
        profile,
        workspace,
        notifications,
        appearance,
      } = parsed.data;

      const userId = getUserId(req);

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const member = await getCurrentWorkspace(userId);

      if (!member) {
        return res.status(403).json({
          success: false,
          message:
            "Active workspace membership not found.",
        });
      }

      if (profile.email !== user.email) {
        const existingUser =
          await prisma.user.findUnique({
            where: {
              email: profile.email,
            },
          });

        if (
          existingUser &&
          existingUser.id !== userId
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Email address is already in use.",
          });
        }
      }

      /*
       * IMPORTANT:
       * profile.role is intentionally NOT written to User.role.
       *
       * The legacy User.role column remains only for backwards
       * compatibility during the RBAC migration.
       */

      const updated =
        await prisma.$transaction(async (tx) => {
          const updatedUser =
            await tx.user.update({
              where: {
                id: userId,
              },
              data: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                phone: profile.phone,
                bio: profile.bio,
                name: `${profile.firstName} ${profile.lastName}`.trim(),
              },
            });

          /*
           * Workspace.name is now the authoritative workspace name.
           */
          const updatedWorkspace =
            await tx.workspace.update({
              where: {
                id: member.workspaceId,
              },
              data: {
                name: workspace.name,
              },
            });

          const updatedSettings =
            await tx.settings.upsert({
              where: {
                userId,
              },

              update: {
                /*
                 * Keep this field synchronized for backwards
                 * compatibility with older frontend/API consumers.
                 */
                workspaceName: workspace.name,

                website: workspace.website,
                industry: workspace.industry,
                timezone: workspace.timezone,
                currency: workspace.currency,

                notificationEmail:
                  notifications.email,
                notificationProjects:
                  notifications.projects,
                notificationInvoices:
                  notifications.invoices,
                notificationTasks:
                  notifications.tasks,
                notificationWeekly:
                  notifications.weekly,
                notificationMarketing:
                  notifications.marketing,

                appearance,
              },

              create: {
                userId,

                workspaceName: workspace.name,
                website: workspace.website,
                industry: workspace.industry,
                timezone: workspace.timezone,
                currency: workspace.currency,

                notificationEmail:
                  notifications.email,
                notificationProjects:
                  notifications.projects,
                notificationInvoices:
                  notifications.invoices,
                notificationTasks:
                  notifications.tasks,
                notificationWeekly:
                  notifications.weekly,
                notificationMarketing:
                  notifications.marketing,

                appearance,
              },
            });

          return {
            user: updatedUser,
            workspace: updatedWorkspace,
            settings: updatedSettings,
          };
        });

      /*
       * Reload authorization after the transaction so the response
       * always contains the current RBAC state.
       */
      const authorization =
        await getAuthorizationContext(userId);

      if (!authorization) {
        return res.status(403).json({
          success: false,
          message:
            "Authorization context could not be loaded.",
        });
      }

      return res.json({
        success: true,
        message:
          "Settings updated successfully.",

        data: {
          profile: {
            firstName: updated.user.firstName,
            lastName: updated.user.lastName,
            email: updated.user.email,
            phone: updated.user.phone,

            /*
             * Never use the request's profile.role here.
             */
            role: authorization.roleName,

            bio: updated.user.bio,
          },

          workspace: {
            name: updated.workspace.name,
            website: updated.settings.website,
            industry: updated.settings.industry,
            timezone: updated.settings.timezone,
            currency: updated.settings.currency,
          },

          notifications: {
            email:
              updated.settings.notificationEmail,
            projects:
              updated.settings.notificationProjects,
            invoices:
              updated.settings.notificationInvoices,
            tasks:
              updated.settings.notificationTasks,
            weekly:
              updated.settings.notificationWeekly,
            marketing:
              updated.settings.notificationMarketing,
          },

          appearance:
            updated.settings.appearance,

          authorization: {
            workspaceId:
              authorization.workspaceId,
            workspaceName:
              authorization.workspaceName,
            memberId:
              authorization.memberId,
            roleId:
              authorization.roleId,
            roleName:
              authorization.roleName,
            status:
              authorization.status,
            permissions:
              authorization.permissions,
          },
        },
      });
    } catch (error) {
      console.error(
        "PATCH /api/settings error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update settings.",
      });
    }
  },
);

export default router;