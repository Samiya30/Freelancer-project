import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

async function getDemoUser() {
  let user = await prisma.user.findFirst({
    orderBy: {
      id: "asc",
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Demo Freelancer",
        email: "demo@freelanceos.local",
      },
    });
  }

  return user;
}

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

    const user = await getDemoUser();

    /*
     * Dashboard date ranges
     *
     * We use UTC boundaries so the database queries are
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

    /*
     * Fetch dashboard data in parallel.
     */
    const [
      currentMonthPayments,
      outstandingInvoices,
      activeClients,
      currentMonthTimeEntries,
      yearlyPayments,
      activeProjects,
      recentInvoices,
    ] = await Promise.all([
      // Revenue this month
      prisma.payment.findMany({
        where: {
          userId: user.id,
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

      // Outstanding invoices
      prisma.invoice.findMany({
        where: {
          userId: user.id,
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

      // Active clients
      prisma.client.count({
        where: {
          userId: user.id,
          status: "Active",
        },
      }),

      // Hours worked this month
      prisma.timeEntry.findMany({
        where: {
          userId: user.id,
          date: {
            gte: currentMonthStart,
            lt: nextMonthStart,
          },
        },
        select: {
          duration: true,
        },
      }),

      // Payments for selected year
      prisma.payment.findMany({
        where: {
          userId: user.id,
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

      // Active projects
      prisma.project.findMany({
        where: {
          userId: user.id,
          status: {
            in: ["Planning", "InProgress", "Review"],
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

      // Recent invoices
      prisma.invoice.findMany({
        where: {
          userId: user.id,
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

    /*
     * Calculate revenue this month.
     */
    const revenueThisMonth = currentMonthPayments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    /*
     * Calculate outstanding invoice total.
     */
    const outstandingInvoiceTotal = outstandingInvoices.reduce(
      (total, invoice) => total + invoice.amount,
      0,
    );

    /*
     * TimeEntry.duration is stored as an integer.
     * The frontend displays hours, so convert minutes to hours.
     */
    const minutesWorkedThisMonth = currentMonthTimeEntries.reduce(
      (total, entry) => total + entry.duration,
      0,
    );

    const hoursWorkedThisMonth =
      minutesWorkedThisMonth / 60;

    /*
     * Build monthly revenue for the selected year.
     */
    const monthlyRevenue = Array.from(
      { length: 12 },
      () => 0,
    );

    for (const payment of yearlyPayments) {
      const month = payment.date.getUTCMonth();

        monthlyRevenue[month] =
        (monthlyRevenue[month] ?? 0) + payment.amount;
    }

    /*
     * The existing dashboard chart expects percentage-style
     * values from 0 to 100.
     *
     * Convert actual monthly revenue into relative bar heights.
     */
    const maximumMonthlyRevenue = Math.max(
      ...monthlyRevenue,
      0,
    );

    const revenueChart = monthlyRevenue.map((amount) => {
      if (maximumMonthlyRevenue === 0) {
        return 0;
      }

      return Math.round(
        (amount / maximumMonthlyRevenue) * 100,
      );
    });

    return res.json({
      success: true,
      data: {
        year: yearValue,

        stats: {
          revenueThisMonth,
          outstandingInvoices: outstandingInvoiceTotal,
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
    console.error("GET /api/dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
    });
  }
});

export default router;