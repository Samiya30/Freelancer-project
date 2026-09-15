import { Router, type Request } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

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
 * GET /api/dashboard?year=2026
 *
 * Requires:
 * - Authentication
 * - dashboard.view permission
 *
 * All dashboard data is scoped to the authenticated user.
 */
router.get(
  "/",
  requirePermission("dashboard.view"),
  async (req, res) => {
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

      /*
       * Dashboard date ranges.
       *
       * UTC boundaries keep the database queries
       * predictable and consistent.
       */
      const now = new Date();

      const currentMonthStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          1,
        ),
      );

      const nextMonthStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          1,
        ),
      );

      const yearStart = new Date(
        Date.UTC(yearValue, 0, 1),
      );

      const nextYearStart = new Date(
        Date.UTC(yearValue + 1, 0, 1),
      );

      const [
        currentMonthPayments,
        outstandingInvoices,
        activeClients,
        currentMonthTimeEntries,
        yearlyPayments,
        activeProjects,
        recentInvoices,
      ] = await Promise.all([
        prisma.payment.findMany({
          where: {
            userId,
            status: "Completed",
            date: {
              gte: currentMonthStart,
              lt: nextMonthStart,
            },
          },
          select: {
            amount: true,
          },
        }),

        prisma.invoice.findMany({
          where: {
            userId,
            status: {
              in: ["Sent", "Viewed", "Overdue"],
            },
          },
          select: {
            id: true,
            number: true,
            client: true,
            amount: true,
            status: true,
            issueDate: true,
            dueDate: true,
          },
          orderBy: {
            issueDate: "desc",
          },
        }),

        prisma.client.count({
          where: {
            userId,
            status: "Active",
          },
        }),

        prisma.timeEntry.findMany({
          where: {
            userId,
            date: {
              gte: currentMonthStart,
              lt: nextMonthStart,
            },
          },
          select: {
            duration: true,
          },
        }),

        prisma.payment.findMany({
          where: {
            userId,
            status: "Completed",
            date: {
              gte: yearStart,
              lt: nextYearStart,
            },
          },
          select: {
            amount: true,
            date: true,
          },
          orderBy: {
            date: "asc",
          },
        }),

        prisma.project.findMany({
          where: {
            userId,
            status: {
              in: [
                "Planning",
                "InProgress",
                "Review",
              ],
            },
          },
          select: {
            id: true,
            name: true,
            client: true,
            progress: true,
            budget: true,
            status: true,
            startDate: true,
            dueDate: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 5,
        }),

        prisma.invoice.findMany({
          where: {
            userId,
          },
          select: {
            id: true,
            number: true,
            client: true,
            amount: true,
            status: true,
            issueDate: true,
          },
          orderBy: {
            issueDate: "desc",
          },
          take: 5,
        }),
      ]);

      const revenueThisMonth =
        currentMonthPayments.reduce(
          (total, payment) =>
            total + payment.amount,
          0,
        );

      const outstandingInvoiceTotal =
        outstandingInvoices.reduce(
          (total, invoice) =>
            total + invoice.amount,
          0,
        );

      const minutesWorkedThisMonth =
        currentMonthTimeEntries.reduce(
          (total, entry) =>
            total + entry.duration,
          0,
        );

      const hoursWorkedThisMonth =
        minutesWorkedThisMonth / 60;

      const monthlyRevenue = Array.from(
        { length: 12 },
        () => 0,
      );

      for (const payment of yearlyPayments) {
        const month =
          payment.date.getUTCMonth();

        monthlyRevenue[month] =
          (monthlyRevenue[month] ?? 0) +
          payment.amount;
      }

      const maximumMonthlyRevenue =
        Math.max(
          ...monthlyRevenue,
          0,
        );

      const revenueChart =
        monthlyRevenue.map((amount) => {
          if (
            maximumMonthlyRevenue === 0
          ) {
            return 0;
          }

          return Math.round(
            (amount /
              maximumMonthlyRevenue) *
              100,
          );
        });

      return res.json({
        success: true,
        data: {
          year: yearValue,

          stats: {
            revenueThisMonth,
            outstandingInvoices:
              outstandingInvoiceTotal,
            outstandingInvoiceCount:
              outstandingInvoices.length,
            activeClients,
            hoursWorked: Number(
              hoursWorkedThisMonth.toFixed(1),
            ),
          },

          revenue: {
            monthly: monthlyRevenue,
            chart: revenueChart,
          },

          projects: activeProjects,

          invoices: recentInvoices,

          outstandingInvoices,
        },
      });
    } catch (error) {
      console.error(
        "GET /api/dashboard error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load dashboard.",
      });
    }
  },
);

export default router;