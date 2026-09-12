import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const expenseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.enum([
    "Software",
    "Marketing",
    "Travel",
    "Office",
    "Equipment",
    "Utilities",
    "Other",
  ]),
  amount: z.number().finite().nonnegative(),
  date: z.coerce.date(),
  status: z.enum(["Paid", "Pending"]),
  project: z.string().max(200).nullable().optional(),
  vendor: z.string().max(200).nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

const updateExpenseSchema = expenseSchema.partial();

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

async function validateProject(
  userId: number,
  projectId: number | null | undefined,
) {
  if (projectId === undefined || projectId === null) {
    return null;
  }

  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });
}

/**
 * GET /api/expenses
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
      },
      include: {
        projectRecord: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error("GET /api/expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
});

/**
 * GET /api/expenses/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        projectRecord: true,
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("GET /api/expenses/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
    });
  }
});

/**
 * POST /api/expenses
 */
router.post("/", async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const userId = getUserId(req);

    const project = await validateProject(
      userId,
      data.projectId,
    );

    if (
      data.projectId !== undefined &&
      data.projectId !== null &&
      !project
    ) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        amount: data.amount,
        date: data.date,
        status: data.status,

        ...(data.project !== undefined
          ? { project: data.project }
          : {}),

        ...(data.vendor !== undefined
          ? { vendor: data.vendor }
          : {}),

        ...(data.projectId !== undefined
          ? { projectId: data.projectId }
          : {}),
      },
      include: {
        projectRecord: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense data",
        errors: error.flatten(),
      });
    }

    console.error("POST /api/expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create expense",
    });
  }
});

/**
 * PATCH /api/expenses/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const data = updateExpenseSchema.parse(req.body);

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    const project = await validateProject(
      userId,
      data.projectId,
    );

    if (
      data.projectId !== undefined &&
      data.projectId !== null &&
      !project
    ) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    const expense = await prisma.expense.update({
      where: {
        id,
      },
      data: {
        ...(data.title !== undefined
          ? { title: data.title }
          : {}),

        ...(data.description !== undefined
          ? { description: data.description }
          : {}),

        ...(data.category !== undefined
          ? { category: data.category }
          : {}),

        ...(data.amount !== undefined
          ? { amount: data.amount }
          : {}),

        ...(data.date !== undefined
          ? { date: data.date }
          : {}),

        ...(data.status !== undefined
          ? { status: data.status }
          : {}),

        ...(data.project !== undefined
          ? { project: data.project }
          : {}),

        ...(data.vendor !== undefined
          ? { vendor: data.vendor }
          : {}),

        ...(data.projectId !== undefined
          ? { projectId: data.projectId }
          : {}),
      },
      include: {
        projectRecord: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense data",
        errors: error.flatten(),
      });
    }

    console.error("PATCH /api/expenses/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
    });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await prisma.expense.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/expenses/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    });
  }
});

export default router;