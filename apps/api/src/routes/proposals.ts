import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const proposalStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Rejected",
  "Expired",
]);

const createProposalSchema = z.object({
  number: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(200),
  client: z.string().trim().min(1).max(160),
  clientEmail: z.string().trim().email().max(255),
  project: z.string().trim().min(1).max(200),
  amount: z.number().finite().nonnegative(),
  status: proposalStatusSchema.optional(),
  issueDate: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  description: z.string().max(5000).optional(),
  clientId: z.number().int().positive().optional(),
});

const updateProposalSchema = z.object({
  number: z.string().trim().min(1).max(50).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  client: z.string().trim().min(1).max(160).optional(),
  clientEmail: z.string().trim().email().max(255).optional(),
  project: z.string().trim().min(1).max(200).optional(),
  amount: z.number().finite().nonnegative().optional(),
  status: proposalStatusSchema.optional(),
  issueDate: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  description: z.string().max(5000).optional(),
  clientId: z.number().int().positive().nullable().optional(),
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

async function validateClient(
  userId: number,
  clientId: number | null | undefined,
) {
  if (clientId === undefined || clientId === null) {
    return null;
  }

  return prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
    },
  });
}

/**
 * GET /api/proposals
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    const proposals = await prisma.proposal.findMany({
      where: {
        userId,
      },
      include: {
        clientRecord: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    console.error("GET /api/proposals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch proposals",
    });
  }
});

/**
 * GET /api/proposals/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal ID",
      });
    }

    const userId = getUserId(req);

    const proposal = await prisma.proposal.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        clientRecord: true,
      },
    });

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error("GET /api/proposals/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch proposal",
    });
  }
});

/**
 * POST /api/proposals
 */
router.post("/", async (req, res) => {
  try {
    const parsed = createProposalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal data",
        errors: parsed.error.flatten(),
      });
    }

    const userId = getUserId(req);

    const client = await validateClient(userId, parsed.data.clientId);

    if (parsed.data.clientId !== undefined && !client) {
      return res.status(400).json({
        success: false,
        message: "Client not found",
      });
    }

    const issueDate = parsed.data.issueDate
      ? new Date(parsed.data.issueDate)
      : new Date();

    const validUntil = parsed.data.validUntil
      ? new Date(parsed.data.validUntil)
      : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const proposal = await prisma.proposal.create({
      data: {
        userId,
        number: parsed.data.number,
        title: parsed.data.title,
        client: parsed.data.client,
        clientEmail: parsed.data.clientEmail,
        project: parsed.data.project,
        amount: parsed.data.amount,
        status: parsed.data.status ?? "Draft",
        issueDate,
        validUntil,
        description: parsed.data.description ?? "",
        clientId: client?.id ?? null,
      },
      include: {
        clientRecord: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Proposal created successfully",
      data: proposal,
    });
  } catch (error) {
    console.error("POST /api/proposals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create proposal",
    });
  }
});

/**
 * PATCH /api/proposals/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal ID",
      });
    }

    const parsed = updateProposalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal data",
        errors: parsed.error.flatten(),
      });
    }

    const userId = getUserId(req);

    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingProposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    if (parsed.data.clientId !== undefined) {
      const client = await validateClient(userId, parsed.data.clientId);

      if (parsed.data.clientId !== null && !client) {
        return res.status(400).json({
          success: false,
          message: "Client not found",
        });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.number !== undefined) {
      updateData.number = parsed.data.number;
    }

    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title;
    }

    if (parsed.data.client !== undefined) {
      updateData.client = parsed.data.client;
    }

    if (parsed.data.clientEmail !== undefined) {
      updateData.clientEmail = parsed.data.clientEmail;
    }

    if (parsed.data.project !== undefined) {
      updateData.project = parsed.data.project;
    }

    if (parsed.data.amount !== undefined) {
      updateData.amount = parsed.data.amount;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    if (parsed.data.issueDate !== undefined) {
      updateData.issueDate = new Date(parsed.data.issueDate);
    }

    if (parsed.data.validUntil !== undefined) {
      updateData.validUntil = new Date(parsed.data.validUntil);
    }

    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (parsed.data.clientId !== undefined) {
      updateData.clientId = parsed.data.clientId;
    }

    const proposal = await prisma.proposal.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        clientRecord: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Proposal updated successfully",
      data: proposal,
    });
  } catch (error) {
    console.error("PATCH /api/proposals/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update proposal",
    });
  }
});

/**
 * DELETE /api/proposals/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal ID",
      });
    }

    const userId = getUserId(req);

    const existingProposal = await prisma.proposal.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingProposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    await prisma.proposal.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Proposal deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/proposals/:id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete proposal",
    });
  }
});

export default router;