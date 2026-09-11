import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();

const paymentSchema = z.object({
  paymentNumber: z.string().min(1).max(100),
  clientName: z.string().min(1).max(200),
  invoiceNumber: z.string().min(1).max(100),
  projectName: z.string().min(1).max(200),
  amount: z.number().positive(),
  date: z.coerce.date(),
  method: z.enum(["UPI", "BankTransfer", "Card", "Cash"]),
  status: z.enum(["Completed", "Pending", "Failed"]),
  clientId: z.number().int().positive().nullable().optional(),
  invoiceId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

const updatePaymentSchema = paymentSchema.partial();

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
  data: {
    clientId?: number | null | undefined;
    invoiceId?: number | null | undefined;
    projectId?: number | null | undefined;
  },
){
  const client =
    data.clientId !== undefined && data.clientId !== null
      ? await prisma.client.findFirst({
          where: {
            id: data.clientId,
            userId,
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
 */
router.get("/", async (_req, res) => {
  try {
    const user = await getDemoUser();

    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
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
});

/**
 * GET /api/payments/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await getDemoUser();
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: user.id,
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
});

/**
 * POST /api/payments
 */
router.post("/", async (req, res) => {
  try {
    const data = paymentSchema.parse(req.body);
    const user = await getDemoUser();

    const relations = await validateRelations(user.id, data);

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

    if (data.status === "Completed" && !data.invoiceId) {
      return res.status(400).json({
        success: false,
        message:
          "A completed payment must be linked to an invoice",
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          paymentNumber: data.paymentNumber,
          clientName: data.clientName,
          invoiceNumber: data.invoiceNumber,
          projectName: data.projectName,
          amount: data.amount,
          date: data.date,
          method: data.method,
          status: data.status,
          userId: user.id,
          clientId: data.clientId ?? null,
          invoiceId: data.invoiceId ?? null,
          projectId: data.projectId ?? null,
        },
        include: {
          clientRecord: true,
          invoice: true,
          projectRecord: true,
        },
      });

      if (
        data.status === "Completed" &&
        relations.invoice
      ) {
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
});

/**
 * PATCH /api/payments/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const user = await getDemoUser();
    const id = Number(req.params.id);

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
        userId: user.id,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const relationData = {
      clientId:
        data.clientId !== undefined
          ? data.clientId
          : existingPayment.clientId,

      invoiceId:
        data.invoiceId !== undefined
          ? data.invoiceId
          : existingPayment.invoiceId,

      projectId:
        data.projectId !== undefined
          ? data.projectId
          : existingPayment.projectId,
    };

    const relations = await validateRelations(
      user.id,
      relationData,
    );

    const newStatus =
      data.status ?? existingPayment.status;

    const newInvoiceId =
      relationData.invoiceId ?? null;

    if (newStatus === "Completed" && !newInvoiceId) {
      return res.status(400).json({
        success: false,
        message:
          "A completed payment must be linked to an invoice",
      });
    }

    if (data.paymentNumber) {
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
      const updatedPayment = await tx.payment.update({
        where: {
          id,
        },
        data: {
          ...(data.paymentNumber !== undefined && {
            paymentNumber: data.paymentNumber,
          }),
          ...(data.clientName !== undefined && {
            clientName: data.clientName,
          }),
          ...(data.invoiceNumber !== undefined && {
            invoiceNumber: data.invoiceNumber,
          }),
          ...(data.projectName !== undefined && {
            projectName: data.projectName,
          }),
          ...(data.amount !== undefined && {
            amount: data.amount,
          }),
          ...(data.date !== undefined && {
            date: data.date,
          }),
          ...(data.method !== undefined && {
            method: data.method,
          }),
          ...(data.status !== undefined && {
            status: data.status,
          }),
          ...(data.clientId !== undefined && {
            clientId: data.clientId,
          }),
          ...(data.invoiceId !== undefined && {
            invoiceId: data.invoiceId,
          }),
          ...(data.projectId !== undefined && {
            projectId: data.projectId,
          }),
        },
        include: {
          clientRecord: true,
          invoice: true,
          projectRecord: true,
        },
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

      return updatedPayment;
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
});

/**
 * DELETE /api/payments/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const user = await getDemoUser();
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        id,
        userId: user.id,
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
        id,
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
});

export default router;