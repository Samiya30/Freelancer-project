import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  number: z.string().min(1).max(100),
  client: z.string().min(1).max(200),
  clientEmail: z.string().email(),
  project: z.string().min(1).max(200),
  amount: z.number().nonnegative(),
  status: invoiceStatusSchema.optional(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  description: z.string().max(2000).default(""),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  items: z.array(invoiceItemSchema).optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

async function getDemoUser() {
  return prisma.user.upsert({
    where: {
      email: "demo@freelanceos.local",
    },
    update: {},
    create: {
      name: "Demo Freelancer",
      email: "demo@freelanceos.local",
    },
  });
}

async function validateRelations(
  userId: number,
  clientId?: number | null,
  projectId?: number | null,
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
    if (project.clientId !== null && project.clientId !== client.id) {
      throw new Error(
        "Selected client does not belong to the selected project",
      );
    }
  }

  return { client, project };
}

/**
 * GET /api/invoices
 */
router.get("/", async (_req, res) => {
  try {
    const user = await getDemoUser();

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
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
});

/**
 * GET /api/invoices/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const user = await getDemoUser();

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
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
});

/**
 * POST /api/invoices
 */
router.post("/", async (req, res) => {
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
    const user = await getDemoUser();

    await validateRelations(
      user.id,
      data.clientId,
      data.projectId,
    );

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

    const invoice = await prisma.invoice.create({
      data: {
        number: data.number,
        client: data.client,
        clientEmail: data.clientEmail,
        project: data.project,
        amount: data.amount,
        status: data.status ?? "Draft",
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        description: data.description,
        tax: data.tax ?? 0,
        discount: data.discount ?? 0,
        userId: user.id,
        clientId: data.clientId ?? null,
        projectId: data.projectId ?? null,
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
});

/**
 * PATCH /api/invoices/:id
 */
router.patch("/:id", async (req, res) => {
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
    const user = await getDemoUser();

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await validateRelations(
      user.id,
      data.clientId,
      data.projectId,
    );

    if (
      data.number &&
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

    const invoice = await prisma.$transaction(async (tx) => {
      if (data.items !== undefined) {
        await tx.invoiceItem.deleteMany({
          where: {
            invoiceId: id,
          },
        });
      }

      return tx.invoice.update({
        where: {
          id,
        },
        data: {
          ...(data.number !== undefined && {
            number: data.number,
          }),
          ...(data.client !== undefined && {
            client: data.client,
          }),
          ...(data.clientEmail !== undefined && {
            clientEmail: data.clientEmail,
          }),
          ...(data.project !== undefined && {
            project: data.project,
          }),
          ...(data.amount !== undefined && {
            amount: data.amount,
          }),
          ...(data.status !== undefined && {
            status: data.status,
          }),
          ...(data.issueDate !== undefined && {
            issueDate: data.issueDate,
          }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate,
          }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.tax !== undefined && {
            tax: data.tax,
          }),
          ...(data.discount !== undefined && {
            discount: data.discount,
          }),
          ...(data.clientId !== undefined && {
            clientId: data.clientId,
          }),
          ...(data.projectId !== undefined && {
            projectId: data.projectId,
          }),
          ...(data.items !== undefined && {
            items: {
              create: data.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
              })),
            },
          }),
        },
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
});

/**
 * DELETE /api/invoices/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const user = await getDemoUser();

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId: user.id,
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
        id,
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
});

export default router;