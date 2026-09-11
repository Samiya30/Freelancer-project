import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const createTimeEntrySchema = z.object({
  description: z.string().trim().min(1).max(500),
  projectId: z.number().int().positive(),
  taskId: z.number().int().positive().optional(),
  date: z.string().datetime(),
  duration: z.number().int().positive(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().min(0).optional(),
});

const updateTimeEntrySchema = z.object({
  description: z.string().trim().min(1).max(500).optional(),
  projectId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  date: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().min(0).optional(),
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

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    const entries = await prisma.timeEntry.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error("Failed to fetch time entries:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch time entries",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid time entry ID",
      });
    }

    const userId = getUserId(req);

    const entry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found",
      });
    }

    return res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Failed to fetch time entry:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch time entry",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = createTimeEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid time entry data",
        errors: parsed.error.flatten(),
      });
    }

    const userId = getUserId(req);

    const project = await prisma.project.findFirst({
      where: {
        id: parsed.data.projectId,
        userId,
      },
    });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    let taskId: number | null = null;
    let taskName: string | null = null;

    if (parsed.data.taskId !== undefined) {
      const task = await prisma.task.findFirst({
        where: {
          id: parsed.data.taskId,
          projectId: project.id,
          userId,
        },
      });

      if (!task) {
        return res.status(400).json({
          success: false,
          message: "Task not found for the selected project",
        });
      }

      taskId = task.id;
      taskName = task.title;
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        description: parsed.data.description,
        projectId: project.id,
        projectName: project.name,
        taskId,
        taskName,
        date: new Date(parsed.data.date),
        duration: parsed.data.duration,
        billable: parsed.data.billable ?? true,
        hourlyRate: parsed.data.hourlyRate ?? 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Time entry created successfully",
      data: entry,
    });
  } catch (error) {
    console.error("Failed to create time entry:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create time entry",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid time entry ID",
      });
    }

    const parsed = updateTimeEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid time entry data",
        errors: parsed.error.flatten(),
      });
    }

    const userId = getUserId(req);

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found",
      });
    }

    const updateData: {
      description?: string;
      projectId?: number;
      projectName?: string;
      taskId?: number | null;
      taskName?: string | null;
      date?: Date;
      duration?: number;
      billable?: boolean;
      hourlyRate?: number;
    } = {};

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (parsed.data.date !== undefined) {
      updateData.date = new Date(parsed.data.date);
    }

    if (parsed.data.duration !== undefined) {
      updateData.duration = parsed.data.duration;
    }

    if (parsed.data.billable !== undefined) {
      updateData.billable = parsed.data.billable;
    }

    if (parsed.data.hourlyRate !== undefined) {
      updateData.hourlyRate = parsed.data.hourlyRate;
    }

    let selectedProjectId = existingEntry.projectId;

    if (parsed.data.projectId !== undefined) {
      const project = await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          userId,
        },
      });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }

      selectedProjectId = project.id;

      updateData.projectId = project.id;
      updateData.projectName = project.name;
    }

    if (parsed.data.taskId !== undefined) {
      if (parsed.data.taskId === null) {
        updateData.taskId = null;
        updateData.taskName = null;
      } else {
        const task = await prisma.task.findFirst({
          where: {
            id: parsed.data.taskId,
            projectId: selectedProjectId,
            userId,
          },
        });

        if (!task) {
          return res.status(400).json({
            success: false,
            message: "Task not found for the selected project",
          });
        }

        updateData.taskId = task.id;
        updateData.taskName = task.title;
      }
    } else if (
      parsed.data.projectId !== undefined &&
      existingEntry.taskId !== null
    ) {
      const existingTask = await prisma.task.findFirst({
        where: {
          id: existingEntry.taskId,
          projectId: selectedProjectId,
          userId,
        },
      });

      if (!existingTask) {
        updateData.taskId = null;
        updateData.taskName = null;
      }
    }

    const entry = await prisma.timeEntry.update({
      where: {
        id,
      },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Time entry updated successfully",
      data: entry,
    });
  } catch (error) {
    console.error("Failed to update time entry:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update time entry",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid time entry ID",
      });
    }

    const userId = getUserId(req);

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found",
      });
    }

    await prisma.timeEntry.delete({
      where: {
        id,
      },
    });

    return res.json({
      success: true,
      message: "Time entry deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete time entry:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete time entry",
    });
  }
});

export default router;