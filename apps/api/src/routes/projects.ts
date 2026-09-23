import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

const router = Router();

const projectStatusSchema = z.enum([
  "Planning",
  "InProgress",
  "Review",
  "Completed",
  "OnHold",
]);

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  client: z.string().trim().min(1).max(160),
  clientEmail: z.string().trim().email().max(255),
  description: z.string().max(10000).optional(),
  status: projectStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  budget: z.number().finite().nonnegative(),
  progress: z.number().finite().min(0).max(100).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  client: z.string().trim().min(1).max(160).optional(),
  clientEmail: z.string().trim().email().max(255).optional(),
  description: z.string().max(10000).optional(),
  status: projectStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  budget: z.number().finite().nonnegative().optional(),
  progress: z.number().finite().min(0).max(100).optional(),
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

async function findClientForProject(
  userId: number,
  workspaceId: number,
  clientName: string,
  clientEmail: string,
) {
  return prisma.client.findFirst({
    where: {
      userId,
      workspaceId,
      name: clientName,
      email: clientEmail,
    },
  });
}

/**
 * GET /api/projects
 *
 * Requires:
 * - Authentication
 * - projects.view permission
 *
 * Ownership:
 * - Only returns projects belonging to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/",
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const projects = await prisma.project.findMany({
        where: {
          userId,
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("GET /api/projects error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch projects",
      });
    }
  },
);

/**
 * GET /api/projects/:id
 *
 * Requires:
 * - Authentication
 * - projects.view permission
 *
 * Ownership:
 * - Project must belong to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/:id",
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error("GET /api/projects/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch project",
      });
    }
  },
);

/**
 * POST /api/projects
 *
 * Requires:
 * - Authentication
 * - projects.create permission
 *
 * Ownership:
 * - Project is assigned to the authenticated user and workspace.
 * - Selected client must belong to the authenticated user's workspace.
 */
router.post(
  "/",
  requirePermission("projects.create"),
  async (req, res) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid project data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const client = await findClientForProject(
        userId,
        workspaceId,
        parsed.data.client,
        parsed.data.clientEmail,
      );

      if (!client) {
        return res.status(400).json({
          success: false,
          message:
            "Client not found. Please select an existing client.",
        });
      }

      const startDate = parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : new Date();

      const dueDate = parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : new Date(
            startDate.getTime() +
              30 * 24 * 60 * 60 * 1000,
          );

      if (dueDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be before start date",
        });
      }

      const project = await prisma.project.create({
        data: {
          userId,
          workspaceId,
          name: parsed.data.name,
          client: client.name,
          clientEmail: client.email,
          clientId: client.id,
          description: parsed.data.description ?? "",
          status: parsed.data.status ?? "Planning",
          startDate,
          dueDate,
          budget: parsed.data.budget,
          progress: parsed.data.progress ?? 0,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project,
      });
    } catch (error) {
      console.error("POST /api/projects error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create project",
      });
    }
  },
);

/**
 * PATCH /api/projects/:id
 *
 * Requires:
 * - Authentication
 * - projects.update permission
 *
 * Ownership:
 * - Existing project must belong to the authenticated user
 *   inside the active workspace.
 * - New client must also belong to the same workspace.
 */
router.patch(
  "/:id",
  requirePermission("projects.update"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      const parsed = updateProjectSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid project data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const existingProject = await prisma.project.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      const updateData: Record<string, unknown> = {};

      if (parsed.data.name !== undefined) {
        updateData.name = parsed.data.name;
      }

      if (
        parsed.data.client !== undefined ||
        parsed.data.clientEmail !== undefined
      ) {
        const clientName =
          parsed.data.client ?? existingProject.client;

        const clientEmail =
          parsed.data.clientEmail ??
          existingProject.clientEmail;

        const client = await findClientForProject(
          userId,
          workspaceId,
          clientName,
          clientEmail,
        );

        if (!client) {
          return res.status(400).json({
            success: false,
            message:
              "Client not found. Please select an existing client.",
          });
        }

        updateData.client = client.name;
        updateData.clientEmail = client.email;
        updateData.clientId = client.id;
      }

      if (parsed.data.description !== undefined) {
        updateData.description = parsed.data.description;
      }

      if (parsed.data.status !== undefined) {
        updateData.status = parsed.data.status;
      }

      const startDate =
        parsed.data.startDate !== undefined
          ? new Date(parsed.data.startDate)
          : existingProject.startDate;

      const dueDate =
        parsed.data.dueDate !== undefined
          ? new Date(parsed.data.dueDate)
          : existingProject.dueDate;

      if (dueDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be before start date",
        });
      }

      if (parsed.data.startDate !== undefined) {
        updateData.startDate = startDate;
      }

      if (parsed.data.dueDate !== undefined) {
        updateData.dueDate = dueDate;
      }

      if (parsed.data.budget !== undefined) {
        updateData.budget = parsed.data.budget;
      }

      if (parsed.data.progress !== undefined) {
        updateData.progress = parsed.data.progress;
      }

      const project = await prisma.project.update({
        where: {
          id: existingProject.id,
        },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: project,
      });
    } catch (error) {
      console.error("PATCH /api/projects/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update project",
      });
    }
  },
);

/**
 * DELETE /api/projects/:id
 *
 * Requires:
 * - Authentication
 * - projects.delete permission
 *
 * Ownership:
 * - Project must belong to the authenticated user
 *   inside the active workspace.
 */
router.delete(
  "/:id",
  requirePermission("projects.delete"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const existingProject = await prisma.project.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      await prisma.project.delete({
        where: {
          id: existingProject.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/projects/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete project",
      });
    }
  },
);

export default router;