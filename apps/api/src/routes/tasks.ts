import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

const router = Router();

const taskStatusSchema = z.enum([
  "ToDo",
  "InProgress",
  "Review",
  "Done",
]);

const taskPrioritySchema = z.enum([
  "Low",
  "Medium",
  "High",
  "Urgent",
]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional(),
  projectId: z.number().int().positive(),
  dueDate: z.string().datetime(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  projectId: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});

function toPrismaStatus(status: string) {
  switch (status) {
    case "ToDo":
      return "ToDo";
    case "InProgress":
      return "InProgress";
    case "Review":
      return "Review";
    case "Done":
      return "Done";
    default:
      return "ToDo";
  }
}

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

/**
 * GET /api/tasks
 *
 * Requires:
 * - Authentication
 * - tasks.view permission
 *
 * Ownership:
 * - Only returns tasks belonging to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/",
  requirePermission("tasks.view"),
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

      const tasks = await prisma.task.findMany({
        where: {
          userId,
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error("Failed to fetch tasks:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch tasks",
      });
    }
  },
);

/**
 * GET /api/tasks/:id
 *
 * Requires:
 * - Authentication
 * - tasks.view permission
 *
 * Ownership:
 * - Task must belong to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/:id",
  requirePermission("tasks.view"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
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

      const task = await prisma.task.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      return res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error("Failed to fetch task:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch task",
      });
    }
  },
);

/**
 * POST /api/tasks
 *
 * Requires:
 * - Authentication
 * - tasks.create permission
 *
 * Ownership:
 * - Task is assigned to authenticated user and workspace.
 * - Project must belong to the authenticated user's workspace.
 */
router.post(
  "/",
  requirePermission("tasks.create"),
  async (req, res) => {
    try {
      const parsed = createTaskSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid task data",
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

      const project = await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          userId,
          workspaceId,
        },
      });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }

      const task = await prisma.task.create({
        data: {
          userId,
          workspaceId,
          title: parsed.data.title,
          description: parsed.data.description ?? "",
          projectId: project.id,
          projectName: project.name,
          dueDate: new Date(parsed.data.dueDate),
          status: toPrismaStatus(parsed.data.status ?? "ToDo"),
          priority: parsed.data.priority ?? "Medium",
        },
      });

      return res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: task,
      });
    } catch (error) {
      console.error("Failed to create task:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create task",
      });
    }
  },
);

/**
 * PATCH /api/tasks/:id
 *
 * Requires:
 * - Authentication
 * - tasks.update permission
 *
 * Ownership:
 * - Existing task must belong to authenticated user
 *   inside the active workspace.
 * - New projectId must also belong to that workspace.
 */
router.patch(
  "/:id",
  requirePermission("tasks.update"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      const parsed = updateTaskSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid task data",
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

      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      const updateData: {
        title?: string;
        description?: string;
        projectId?: number;
        projectName?: string;
        dueDate?: Date;
        status?: "ToDo" | "InProgress" | "Review" | "Done";
        priority?: "Low" | "Medium" | "High" | "Urgent";
      } = {};

      if (parsed.data.title !== undefined) {
        updateData.title = parsed.data.title;
      }

      if (parsed.data.description !== undefined) {
        updateData.description = parsed.data.description;
      }

      if (parsed.data.projectId !== undefined) {
        const project = await prisma.project.findFirst({
          where: {
            id: parsed.data.projectId,
            userId,
            workspaceId,
          },
        });

        if (!project) {
          return res.status(400).json({
            success: false,
            message: "Project not found",
          });
        }

        updateData.projectId = project.id;
        updateData.projectName = project.name;
      }

      if (parsed.data.dueDate !== undefined) {
        updateData.dueDate = new Date(parsed.data.dueDate);
      }

      if (parsed.data.status !== undefined) {
        updateData.status = toPrismaStatus(parsed.data.status) as
          | "ToDo"
          | "InProgress"
          | "Review"
          | "Done";
      }

      if (parsed.data.priority !== undefined) {
        updateData.priority = parsed.data.priority;
      }

      const task = await prisma.task.update({
        where: {
          id: existingTask.id,
        },
        data: updateData,
      });

      return res.json({
        success: true,
        message: "Task updated successfully",
        data: task,
      });
    } catch (error) {
      console.error("Failed to update task:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update task",
      });
    }
  },
);

/**
 * DELETE /api/tasks/:id
 *
 * Requires:
 * - Authentication
 * - tasks.delete permission
 *
 * Ownership:
 * - Task must belong to authenticated user
 *   inside the active workspace.
 */
router.delete(
  "/:id",
  requirePermission("tasks.delete"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
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

      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      await prisma.task.delete({
        where: {
          id: existingTask.id,
        },
      });

      return res.json({
        success: true,
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete task",
      });
    }
  },
);

export default router;