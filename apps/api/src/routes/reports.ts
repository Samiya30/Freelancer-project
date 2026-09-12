import { Router, type Request } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

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

/**
 * GET /api/reports?year=2026
 *
 * Returns the source data required by the Reports dashboard.
 * Calculations remain transparent and can be performed by
 * the frontend.
 */
router.get("/", async (req, res) => {
  try {
    const yearValue = Number(
      req.query.year || new Date().getFullYear(),
    );

    if (
      !Number.isInteger(yearValue) ||
      yearValue < 2000 ||
      yearValue > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year.",
      });
    }

    const userId = getUserId(req);

    const startDate = new Date(
      `${yearValue}-01-01T00:00:00.000Z`,
    );

    const endDate = new Date(
      `${yearValue + 1}-01-01T00:00:00.000Z`,
    );

    const [
      projects,
      invoices,
      payments,
      expenses,
      clients,
    ] = await Promise.all([
      prisma.project.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.invoice.findMany({
        where: {
          userId,
          issueDate: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: {
          issueDate: "desc",
        },
      }),

      prisma.payment.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: {
          date: "desc",
        },
      }),

      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: {
          date: "desc",
        },
      }),

      prisma.client.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        year: yearValue,
        projects,
        invoices,
        payments,
        expenses,
        clients,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/reports error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load reports.",
    });
  }
});

export default router;