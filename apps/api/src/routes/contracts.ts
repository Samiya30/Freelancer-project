import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

const router = Router();

const contractStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Viewed",
  "Signed",
  "Expired",
  "Cancelled",
]);

const createContractSchema = z.object({
  number: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(200),
  client: z.string().trim().min(1).max(160),
  clientEmail: z.string().trim().email().max(255),
  project: z.string().trim().min(1).max(200),
  value: z.number().finite().nonnegative(),
  status: contractStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(10000).optional(),
  clientId: z.number().int().positive().optional(),
});

const updateContractSchema = z.object({
  number: z.string().trim().min(1).max(50).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  client: z.string().trim().min(1).max(160).optional(),
  clientEmail: z.string().trim().email().max(255).optional(),
  project: z.string().trim().min(1).max(200).optional(),
  value: z.number().finite().nonnegative().optional(),
  status: contractStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(10000).optional(),
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
  workspaceId: number,
  clientId: number | null | undefined,
) {
  if (clientId === undefined || clientId === null) {
    return null;
  }

  return prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
      workspaceId,
    },
  });
}

/**
 * GET /api/contracts
 *
 * Requires:
 * - Authentication
 * - contracts.view permission
 *
 * Ownership:
 * - Only returns contracts belonging to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/",
  requirePermission("contracts.view"),
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

      const contracts = await prisma.contract.findMany({
        where: {
          userId,
          workspaceId,
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
        data: contracts,
      });
    } catch (error) {
      console.error("GET /api/contracts error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch contracts",
      });
    }
  },
);

/**
 * GET /api/contracts/:id
 *
 * Requires:
 * - Authentication
 * - contracts.view permission
 *
 * Ownership:
 * - Contract must belong to the authenticated user
 *   inside the active workspace.
 */
router.get(
  "/:id",
  requirePermission("contracts.view"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract ID",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const contract = await prisma.contract.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
        include: {
          clientRecord: true,
        },
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          message: "Contract not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: contract,
      });
    } catch (error) {
      console.error("GET /api/contracts/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch contract",
      });
    }
  },
);

/**
 * POST /api/contracts
 *
 * Requires:
 * - Authentication
 * - contracts.create permission
 *
 * Ownership:
 * - Contract is assigned to authenticated user and workspace.
 * - clientId must belong to the same user and workspace.
 */
router.post(
  "/",
  requirePermission("contracts.create"),
  async (req, res) => {
    try {
      const parsed = createContractSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const client = await validateClient(
        userId,
        workspaceId,
        parsed.data.clientId,
      );

      if (parsed.data.clientId !== undefined && !client) {
        return res.status(400).json({
          success: false,
          message: "Client not found",
        });
      }

      const startDate = parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : new Date();

      const endDate = parsed.data.endDate
        ? new Date(parsed.data.endDate)
        : new Date(
            startDate.getTime() + 30 * 24 * 60 * 60 * 1000,
          );

      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }

      const contract = await prisma.contract.create({
        data: {
          userId,
          workspaceId,
          number: parsed.data.number,
          title: parsed.data.title,
          client: parsed.data.client,
          clientEmail: parsed.data.clientEmail,
          project: parsed.data.project,
          value: parsed.data.value,
          status: parsed.data.status ?? "Draft",
          startDate,
          endDate,
          description: parsed.data.description ?? "",
          clientId: client?.id ?? null,
        },
        include: {
          clientRecord: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Contract created successfully",
        data: contract,
      });
    } catch (error) {
      console.error("POST /api/contracts error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create contract",
      });
    }
  },
);

/**
 * PATCH /api/contracts/:id
 *
 * Requires:
 * - Authentication
 * - contracts.update permission
 *
 * Ownership:
 * - Existing contract must belong to authenticated user
 *   inside the active workspace.
 * - New clientId must belong to the same user and workspace.
 */
router.patch(
  "/:id",
  requirePermission("contracts.update"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract ID",
        });
      }

      const parsed = updateContractSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const existingContract = await prisma.contract.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingContract) {
        return res.status(404).json({
          success: false,
          message: "Contract not found",
        });
      }

      if (parsed.data.clientId !== undefined) {
        const client = await validateClient(
          userId,
          workspaceId,
          parsed.data.clientId,
        );

        if (parsed.data.clientId !== null && !client) {
          return res.status(400).json({
            success: false,
            message: "Client not found",
          });
        }
      }

      const startDate =
        parsed.data.startDate !== undefined
          ? new Date(parsed.data.startDate)
          : existingContract.startDate;

      const endDate =
        parsed.data.endDate !== undefined
          ? new Date(parsed.data.endDate)
          : existingContract.endDate;

      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
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

      if (parsed.data.value !== undefined) {
        updateData.value = parsed.data.value;
      }

      if (parsed.data.status !== undefined) {
        updateData.status = parsed.data.status;
      }

      if (parsed.data.startDate !== undefined) {
        updateData.startDate = startDate;
      }

      if (parsed.data.endDate !== undefined) {
        updateData.endDate = endDate;
      }

      if (parsed.data.description !== undefined) {
        updateData.description = parsed.data.description;
      }

      if (parsed.data.clientId !== undefined) {
        updateData.clientId = parsed.data.clientId;
      }

      const contract = await prisma.contract.update({
        where: {
          id: existingContract.id,
        },
        data: updateData,
        include: {
          clientRecord: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Contract updated successfully",
        data: contract,
      });
    } catch (error) {
      console.error("PATCH /api/contracts/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update contract",
      });
    }
  },
);

/**
 * DELETE /api/contracts/:id
 *
 * Requires:
 * - Authentication
 * - contracts.delete permission
 *
 * Ownership:
 * - Contract must belong to authenticated user
 *   inside the active workspace.
 */
router.delete(
  "/:id",
  requirePermission("contracts.delete"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid contract ID",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const existingContract = await prisma.contract.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingContract) {
        return res.status(404).json({
          success: false,
          message: "Contract not found",
        });
      }

      await prisma.contract.delete({
        where: {
          id: existingContract.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Contract deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/contracts/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete contract",
      });
    }
  },
);

export default router;