import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

const router = Router();

const paymentSchema = z.object({
  paymentNumber: z.string().trim().min(1).max(100),
  clientName: z.string().trim().min(1).max(200),
  invoiceNumber: z.string().trim().min(1).max(100),
  projectName: z.string().trim().min(1).max(200),
  amount: z.number().finite().positive(),
  date: z.coerce.date(),
  method: z.enum(["UPI", "BankTransfer", "Card", "Cash"]),
  status: z.enum(["Completed", "Pending", "Failed"]),
  clientId: z.number().int().positive().nullable().optional(),
  invoiceId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

const updatePaymentSchema = paymentSchema.partial();

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
 * Validates all selected relationships against the authenticated
 * user's active workspace.
 *
 * Also validates:
 * Client -> Invoice
 * Project -> Invoice
 * Client -> Project
 */
async function validateRelations(
  userId: number,
  workspaceId: number,
  data: {
    clientId?: number | null | undefined;
    invoiceId?: number | null | undefined;
    projectId?: number | null | undefined;
  },
) {
  const client =
    data.clientId !== undefined && data.clientId !== null
      ? await prisma.client.findFirst({
          where: {
            id: data.clientId,
            userId,
            workspaceId,
          },
        })
      : null;

  if (
    data.clientId !== undefined &&
    data.clientId !== null &&
    !client
  ) {
    throw new Error("Client not found");
  }

  const invoice =
    data.invoiceId !== undefined && data.invoiceId !== null
      ? await prisma.invoice.findFirst({
          where: {
            id: data.invoiceId,
            userId,
            workspaceId,
          },
        })
      : null;

  if (
    data.invoiceId !== undefined &&
    data.invoiceId !== null &&
    !invoice
  ) {
    throw new Error("Invoice not found");
  }

  const project =
    data.projectId !== undefined && data.projectId !== null
      ? await prisma.project.findFirst({
          where: {
            id: data.projectId,
            userId,
            workspaceId,
          },
        })
      : null;

  if (
    data.projectId !== undefined &&
    data.projectId !== null &&
    !project
  ) {
    throw new Error("Project not found");
  }

  if (client && invoice) {
    if (
      invoice.clientId !== null &&
      invoice.clientId !== client.id
    ) {
      throw new Error(
        "Selected client does not belong to the selected invoice",
      );
    }
  }

  if (project && invoice) {
    if (
      invoice.projectId !== null &&
      invoice.projectId !== project.id
    ) {
      throw new Error(
        "Selected project does not belong to the selected invoice",
      );
    }
  }

  if (client && project) {
    if (
      project.clientId !== null &&
      project.clientId !== client.id
    ) {
      throw new Error(
        "Selected client does not belong to the selected project",
      );
    }
  }

  return {
    client,
    invoice,
    project,
  };
}

/**
 * GET /api/payments
 *
 * Requires:
 * - Authentication
 * - payments.view permission
 *
 * Ownership:
 * - Only returns payments belonging to authenticated user
 *   inside the active workspace.
 */
router.get(
  "/",
  requirePermission("payments.view"),
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

      const payments = await prisma.payment.findMany({
        where: {
          userId,
          workspaceId,
        },
        include: {
          clientRecord: true,
          invoice: true,
          projectRecord: true,
        },
        orderBy: {
          date: "desc",
        },
      });

      return res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("GET /api/payments error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
      });
    }
  },
);

/**
 * GET /api/payments/:id
 *
 * Requires:
 * - Authentication
 * - payments.view permission
 *
 * Ownership:
 * - Payment must belong to authenticated user
 *   inside the active workspace.
 */
router.get(
  "/:id",
  requirePermission("payments.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);
      const id = Number(req.params.id);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID",
        });
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
        include: {
          clientRecord: true,
          invoice: true,
          projectRecord: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      return res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("GET /api/payments/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
      });
    }
  },
);

/**
 * POST /api/payments
 *
 * Requires:
 * - Authentication
 * - payments.create permission
 *
 * Ownership:
 * - Payment belongs to authenticated user and workspace.
 * - All linked records belong to authenticated user and workspace.
 */
router.post(
  "/",
  requirePermission("payments.create"),
  async (req, res) => {
    try {
      const data = paymentSchema.parse(req.body);
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const relations = await validateRelations(
        userId,
        workspaceId,
        data,
      );

      if (data.status === "Completed" && !data.invoiceId) {
        return res.status(400).json({
          success: false,
          message:
            "A completed payment must be linked to an invoice",
        });
      }

      const existingPayment = await prisma.payment.findUnique({
        where: {
          paymentNumber: data.paymentNumber,
        },
      });

      if (existingPayment) {
        return res.status(409).json({
          success: false,
          message: "Payment number already exists",
        });
      }

      const clientName =
        relations.client?.name ?? data.clientName;

      const invoiceNumber =
        relations.invoice?.number ?? data.invoiceNumber;

      const projectName =
        relations.project?.name ?? data.projectName;

      const payment = await prisma.$transaction(async (tx) => {
        const createdPayment = await tx.payment.create({
          data: {
            paymentNumber: data.paymentNumber,
            clientName,
            invoiceNumber,
            projectName,
            amount: data.amount,
            date: data.date,
            method: data.method,
            status: data.status,
            userId,
            workspaceId,
            clientId: relations.client?.id ?? null,
            invoiceId: relations.invoice?.id ?? null,
            projectId: relations.project?.id ?? null,
          },
        });

        /*
         * Only the validated invoice belonging to this workspace
         * can be marked as Paid.
         */
        if (data.status === "Completed" && relations.invoice) {
          await tx.invoice.update({
            where: {
              id: relations.invoice.id,
            },
            data: {
              status: "Paid",
            },
          });
        }

        return tx.payment.findUnique({
          where: {
            id: createdPayment.id,
          },
          include: {
            clientRecord: true,
            invoice: true,
            projectRecord: true,
          },
        });
      });

      return res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: payment,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment data",
          errors: error.flatten(),
        });
      }

      console.error("POST /api/payments error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create payment",
      });
    }
  },
);

/**
 * PATCH /api/payments/:id
 *
 * Requires:
 * - Authentication
 * - payments.update permission
 *
 * Ownership:
 * - Existing payment must belong to authenticated user
 *   inside the active workspace.
 * - Final client/invoice/project must belong to that workspace.
 */
router.patch(
  "/:id",
  requirePermission("payments.update"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);
      const id = Number(req.params.id);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID",
        });
      }

      const data = updatePaymentSchema.parse(req.body);

      const existingPayment = await prisma.payment.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      /*
       * Resolve the FINAL relationships after the update.
       */
      const finalClientId =
        data.clientId !== undefined
          ? data.clientId
          : existingPayment.clientId;

      const finalInvoiceId =
        data.invoiceId !== undefined
          ? data.invoiceId
          : existingPayment.invoiceId;

      const finalProjectId =
        data.projectId !== undefined
          ? data.projectId
          : existingPayment.projectId;

      const relations = await validateRelations(
        userId,
        workspaceId,
        {
          clientId: finalClientId,
          invoiceId: finalInvoiceId,
          projectId: finalProjectId,
        },
      );

      const newStatus =
        data.status ?? existingPayment.status;

      if (newStatus === "Completed" && !finalInvoiceId) {
        return res.status(400).json({
          success: false,
          message:
            "A completed payment must be linked to an invoice",
        });
      }

      if (
        data.paymentNumber !== undefined &&
        data.paymentNumber !== existingPayment.paymentNumber
      ) {
        const duplicate = await prisma.payment.findFirst({
          where: {
            paymentNumber: data.paymentNumber,
            id: {
              not: id,
            },
          },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "Payment number already exists",
          });
        }
      }

      const payment = await prisma.$transaction(async (tx) => {
        const updateData: Record<string, unknown> = {};

        if (data.paymentNumber !== undefined) {
          updateData.paymentNumber = data.paymentNumber;
        }

        if (data.clientName !== undefined) {
          updateData.clientName = data.clientName;
        }

        if (data.invoiceNumber !== undefined) {
          updateData.invoiceNumber = data.invoiceNumber;
        }

        if (data.projectName !== undefined) {
          updateData.projectName = data.projectName;
        }

        if (data.amount !== undefined) {
          updateData.amount = data.amount;
        }

        if (data.date !== undefined) {
          updateData.date = data.date;
        }

        if (data.method !== undefined) {
          updateData.method = data.method;
        }

        if (data.status !== undefined) {
          updateData.status = data.status;
        }

        if (data.clientId !== undefined) {
          updateData.clientId = data.clientId;

          if (relations.client) {
            updateData.clientName = relations.client.name;
          }
        }

        if (data.invoiceId !== undefined) {
          updateData.invoiceId = data.invoiceId;

          if (relations.invoice) {
            updateData.invoiceNumber = relations.invoice.number;
          }
        }

        if (data.projectId !== undefined) {
          updateData.projectId = data.projectId;

          if (relations.project) {
            updateData.projectName = relations.project.name;
          }
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: existingPayment.id,
          },
          data: updateData,
        });

        if (newStatus === "Completed" && relations.invoice) {
          await tx.invoice.update({
            where: {
              id: relations.invoice.id,
            },
            data: {
              status: "Paid",
            },
          });
        }

        return tx.payment.findUnique({
          where: {
            id: updatedPayment.id,
          },
          include: {
            clientRecord: true,
            invoice: true,
            projectRecord: true,
          },
        });
      });

      return res.json({
        success: true,
        message: "Payment updated successfully",
        data: payment,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment data",
          errors: error.flatten(),
        });
      }

      console.error("PATCH /api/payments/:id error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update payment",
      });
    }
  },
);

/**
 * DELETE /api/payments/:id
 *
 * Requires:
 * - Authentication
 * - payments.delete permission
 *
 * Ownership:
 * - Payment must belong to authenticated user
 *   inside the active workspace.
 */
router.delete(
  "/:id",
  requirePermission("payments.delete"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);
      const id = Number(req.params.id);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID",
        });
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      await prisma.payment.delete({
        where: {
          id: existingPayment.id,
        },
      });

      return res.json({
        success: true,
        message: "Payment deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/payments/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete payment",
      });
    }
  },
);

export default router;