import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const settingsSchema = z.object({
  profile: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string(),
    email: z.string().trim().email(),
    phone: z.string(),
    role: z.string(),
    bio: z.string(),
  }),

  workspace: z.object({
    name: z.string().trim().min(1),
    website: z.string(),
    industry: z.string(),
    timezone: z.string(),
    currency: z.string(),
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
      currency: "INR (₹)",
    },
  });
}

/**
 * GET /api/settings
 */
router.get("/", async (req, res) => {
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

    const settings = await getOrCreateSettings(userId);

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
          role: user.role,
          bio: user.bio,
        },

        workspace: {
          name: settings.workspaceName,
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
      },
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load settings.",
    });
  }
});

/**
 * PATCH /api/settings
 */
router.patch("/", async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);

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

    if (profile.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: {
          email: profile.email,
        },
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Email address is already in use.",
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          bio: profile.bio,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
        },
      });

      const updatedSettings = await tx.settings.upsert({
        where: {
          userId,
        },
        update: {
          workspaceName: workspace.name,
          website: workspace.website,
          industry: workspace.industry,
          timezone: workspace.timezone,
          currency: workspace.currency,

          notificationEmail: notifications.email,
          notificationProjects: notifications.projects,
          notificationInvoices: notifications.invoices,
          notificationTasks: notifications.tasks,
          notificationWeekly: notifications.weekly,
          notificationMarketing: notifications.marketing,

          appearance,
        },
        create: {
          userId,

          workspaceName: workspace.name,
          website: workspace.website,
          industry: workspace.industry,
          timezone: workspace.timezone,
          currency: workspace.currency,

          notificationEmail: notifications.email,
          notificationProjects: notifications.projects,
          notificationInvoices: notifications.invoices,
          notificationTasks: notifications.tasks,
          notificationWeekly: notifications.weekly,
          notificationMarketing: notifications.marketing,

          appearance,
        },
      });

      return {
        user: updatedUser,
        settings: updatedSettings,
      };
    });

    return res.json({
      success: true,
      message: "Settings updated successfully.",
      data: {
        profile: {
          firstName: updated.user.firstName,
          lastName: updated.user.lastName,
          email: updated.user.email,
          phone: updated.user.phone,
          role: updated.user.role,
          bio: updated.user.bio,
        },

        workspace: {
          name: updated.settings.workspaceName,
          website: updated.settings.website,
          industry: updated.settings.industry,
          timezone: updated.settings.timezone,
          currency: updated.settings.currency,
        },

        notifications: {
          email: updated.settings.notificationEmail,
          projects: updated.settings.notificationProjects,
          invoices: updated.settings.notificationInvoices,
          tasks: updated.settings.notificationTasks,
          weekly: updated.settings.notificationWeekly,
          marketing: updated.settings.notificationMarketing,
        },

        appearance: updated.settings.appearance,
      },
    });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update settings.",
    });
  }
});

export default router;