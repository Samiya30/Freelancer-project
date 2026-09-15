import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

const invoiceStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Viewed",
  "Paid",
  "Overdue",
  "Cancelled",
]);

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().finite().positive(),
  rate: z.number().finite().nonnegative(),
});

const createInvoiceSchema = z.object({
  number: z.string().trim().min(1).max(100),
  client: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(255),
  project: z.string().trim().min(1).max(200),
  amount: z.number().finite().nonnegative(),
  status: invoiceStatusSchema.optional(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  description: z.string().max(2000).default(""),
  tax: z.number().finite().nonnegative().optional(),
  discount: z.number().finite().nonnegative().optional(),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  items: z.array(invoiceItemSchema).optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

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
 * Validate client/project ownership and their relationship.
 *
 * Both records must belong to the authenticated user.
 * If both are selected, the project must belong to that client.
 */
async function validateRelations(
  userId: number,
  clientId: number | null | undefined,
  projectId: number | null | undefined,
) {
  let client = null;
  let project = null;

  if (clientId !== undefined && clientId !== null) {
    client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId,
      },
    });

    if (!client) {
      throw new Error("Client not found");
    }
  }

  if (projectId !== undefined && projectId !== null) {
    project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error("Project not found");
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

  return { client, project };
}

/**
 * GET /api/invoices
 *
 * Requires:
 * - Authentication
 * - invoices.view permission
 *
 * Ownership:
 * - Only returns invoices belonging to the authenticated user.
 */
router.get(
  "/",
  requirePermission("invoices.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      console.error("GET /api/invoices error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch invoices",
      });
    }
  },
);

/**
 * GET /api/invoices/:id
 *
 * Requires:
 * - Authentication
 * - invoices.view permission
 *
 * Ownership:
 * - Invoice must belong to authenticated user.
 */
router.get(
  "/:id",
  requirePermission("invoices.view"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const userId = getUserId(req);

      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          items: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      return res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error("GET /api/invoices/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch invoice",
      });
    }
  },
);

/**
 * POST /api/invoices
 *
 * Requires:
 * - Authentication
 * - invoices.create permission
 *
 * Ownership:
 * - Invoice belongs to authenticated user.
 * - Client/project must belong to authenticated user.
 * - Client/project relationship must be valid.
 */
router.post(
  "/",
  requirePermission("invoices.create"),
  async (req, res) => {
    try {
      const parsed = createInvoiceSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice data",
          errors: parsed.error.flatten(),
        });
      }

      const data = parsed.data;
      const userId = getUserId(req);

      const { client, project } = await validateRelations(
        userId,
        data.clientId,
        data.projectId,
      );

      /*
       * Keep invoice display fields consistent with selected
       * relations when those relations are supplied.
       */
      const clientName = client?.name ?? data.client;
      const clientEmail = client?.email ?? data.clientEmail;
      const projectName = project?.name ?? data.project;

      if (
        client &&
        project &&
        project.clientId !== null &&
        project.clientId !== client.id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected client does not belong to the selected project",
        });
      }

      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          number: data.number,
        },
      });

      if (existingInvoice) {
        return res.status(409).json({
          success: false,
          message: "Invoice number already exists",
        });
      }

      if (data.dueDate < data.issueDate) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be before issue date",
        });
      }

      const invoice = await prisma.invoice.create({
        data: {
          number: data.number,
          client: clientName,
          clientEmail,
          project: projectName,
          amount: data.amount,
          status: data.status ?? "Draft",
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          description: data.description,
          tax: data.tax ?? 0,
          discount: data.discount ?? 0,
          userId,
          clientId: client?.id ?? data.clientId ?? null,
          projectId: project?.id ?? data.projectId ?? null,
          ...(data.items && data.items.length > 0
            ? {
                items: {
                  create: data.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                  })),
                },
              }
            : {}),
        },
        include: {
          items: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error) {
      console.error("POST /api/invoices error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create invoice",
      });
    }
  },
);

/**
 * PATCH /api/invoices/:id
 *
 * Requires:
 * - Authentication
 * - invoices.update permission
 *
 * Ownership:
 * - Existing invoice must belong to authenticated user.
 * - Client/project must belong to authenticated user.
 * - Final client/project relationship must remain valid.
 */
router.patch(
  "/:id",
  requirePermission("invoices.update"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const parsed = updateInvoiceSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice data",
          errors: parsed.error.flatten(),
        });
      }

      const data = parsed.data;
      const userId = getUserId(req);

      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingInvoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      /*
       * Resolve the FINAL client/project relationship.
       *
       * This is important when only one side of the relationship
       * is changed during PATCH.
       */
      const finalClientId =
        data.clientId !== undefined
          ? data.clientId
          : existingInvoice.clientId;

      const finalProjectId =
        data.projectId !== undefined
          ? data.projectId
          : existingInvoice.projectId;

      const { client, project } = await validateRelations(
        userId,
        finalClientId,
        finalProjectId,
      );

      if (
        client &&
        project &&
        project.clientId !== null &&
        project.clientId !== client.id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected client does not belong to the selected project",
        });
      }

      if (
        data.number !== undefined &&
        data.number !== existingInvoice.number
      ) {
        const duplicate = await prisma.invoice.findUnique({
          where: {
            number: data.number,
          },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "Invoice number already exists",
          });
        }
      }

      const finalIssueDate =
        data.issueDate ?? existingInvoice.issueDate;

      const finalDueDate =
        data.dueDate ?? existingInvoice.dueDate;

      if (finalDueDate < finalIssueDate) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be before issue date",
        });
      }

      const invoice = await prisma.$transaction(async (tx) => {
        if (data.items !== undefined) {
          await tx.invoiceItem.deleteMany({
            where: {
              invoiceId: id,
            },
          });
        }

        const updateData: Record<string, unknown> = {};

        if (data.number !== undefined) {
          updateData.number = data.number;
        }

        if (data.client !== undefined) {
          updateData.client = data.client;
        }

        if (data.clientEmail !== undefined) {
          updateData.clientEmail = data.clientEmail;
        }

        if (data.project !== undefined) {
          updateData.project = data.project;
        }

        if (data.amount !== undefined) {
          updateData.amount = data.amount;
        }

        if (data.status !== undefined) {
          updateData.status = data.status;
        }

        if (data.issueDate !== undefined) {
          updateData.issueDate = data.issueDate;
        }

        if (data.dueDate !== undefined) {
          updateData.dueDate = data.dueDate;
        }

        if (data.description !== undefined) {
          updateData.description = data.description;
        }

        if (data.tax !== undefined) {
          updateData.tax = data.tax;
        }

        if (data.discount !== undefined) {
          updateData.discount = data.discount;
        }

        if (data.clientId !== undefined) {
          updateData.clientId = data.clientId;

          /*
           * Keep denormalized client fields synchronized when
           * a real client relation is selected.
           */
          if (client) {
            updateData.client = client.name;
            updateData.clientEmail = client.email;
          }
        }

        if (data.projectId !== undefined) {
          updateData.projectId = data.projectId;

          /*
           * Keep denormalized project name synchronized when
           * a real project relation is selected.
           */
          if (project) {
            updateData.project = project.name;
          }
        }

        if (data.items !== undefined) {
          updateData.items = {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
            })),
          };
        }

        return tx.invoice.update({
          where: {
            id: existingInvoice.id,
          },
          data: updateData,
          include: {
            items: true,
          },
        });
      });

      return res.json({
        success: true,
        message: "Invoice updated successfully",
        data: invoice,
      });
    } catch (error) {
      console.error("PATCH /api/invoices/:id error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update invoice",
      });
    }
  },
);

/**
 * DELETE /api/invoices/:id
 *
 * Requires:
 * - Authentication
 * - invoices.delete permission
 *
 * Ownership:
 * - Invoice must belong to authenticated user.
 */
router.delete(
  "/:id",
  requirePermission("invoices.delete"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const userId = getUserId(req);

      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      await prisma.invoice.delete({
        where: {
          id: invoice.id,
        },
      });

      return res.json({
        success: true,
        message: "Invoice deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/invoices/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete invoice",
      });
    }
  },
);

export default router;