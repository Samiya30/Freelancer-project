import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

const leadStatusSchema = z.enum([
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
]);

const leadSourceSchema = z.enum([
  "Website",
  "LinkedIn",
  "Referral",
  "Instagram",
  "Facebook",
  "Cold Email",
  "Other",
]);

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional(),
  source: leadSourceSchema,
  value: z.number().finite().nonnegative(),
  status: leadStatusSchema.optional(),
  clientId: z.number().int().positive().nullable().optional(),
});

const updateLeadSchema = createLeadSchema.partial();

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

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      userId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  return client;
}

/*
 * GET /api/leads
 *
 * Requires:
 * - Authentication
 * - leads.view permission
 *
 * Ownership:
 * - Only returns leads belonging to the authenticated user.
 */
router.get(
  "/",
  requirePermission("leads.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const leads = await prisma.lead.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      console.error("GET /api/leads error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch leads",
      });
    }
  },
);

/*
 * GET /api/leads/:id
 *
 * Requires:
 * - Authentication
 * - leads.view permission
 *
 * Ownership:
 * - The lead must belong to the authenticated user.
 */
router.get(
  "/:id",
  requirePermission("leads.view"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead ID",
        });
      }

      const userId = getUserId(req);

      const lead = await prisma.lead.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      console.error("GET /api/leads/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch lead",
      });
    }
  },
);

/*
 * POST /api/leads
 *
 * Requires:
 * - Authentication
 * - leads.create permission
 *
 * Ownership:
 * - New lead is always assigned to the authenticated user.
 * - clientId must belong to the authenticated user.
 */
router.post(
  "/",
  requirePermission("leads.create"),
  async (req, res) => {
    try {
      const parsed = createLeadSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);

      await validateClient(userId, parsed.data.clientId);

      const lead = await prisma.lead.create({
        data: {
          userId,
          name: parsed.data.name,
          email: parsed.data.email,
          company: parsed.data.company,
          source: parsed.data.source,
          value: parsed.data.value,
          status: parsed.data.status ?? "New",
          ...(parsed.data.phone !== undefined && {
            phone: parsed.data.phone,
          }),
          ...(parsed.data.clientId !== undefined && {
            clientId: parsed.data.clientId,
          }),
        },
      });

      return res.status(201).json({
        success: true,
        message: "Lead created successfully",
        data: lead,
      });
    } catch (error) {
      console.error("POST /api/leads error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create lead",
      });
    }
  },
);

/*
 * PATCH /api/leads/:id
 *
 * Requires:
 * - Authentication
 * - leads.update permission
 *
 * Ownership:
 * - Existing lead must belong to the authenticated user.
 * - New clientId must also belong to the authenticated user.
 */
router.patch(
  "/:id",
  requirePermission("leads.update"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead ID",
        });
      }

      const parsed = updateLeadSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead data",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);

      const existingLead = await prisma.lead.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }

      if (parsed.data.clientId !== undefined) {
        await validateClient(userId, parsed.data.clientId);
      }

      const updateData = Object.fromEntries(
        Object.entries(parsed.data).filter(
          ([, value]) => value !== undefined,
        ),
      );

      const lead = await prisma.lead.update({
        where: {
          id: existingLead.id,
        },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Lead updated successfully",
        data: lead,
      });
    } catch (error) {
      console.error("PATCH /api/leads/:id error:", error);

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update lead",
      });
    }
  },
);

/*
 * DELETE /api/leads/:id
 *
 * Requires:
 * - Authentication
 * - leads.delete permission
 *
 * Ownership:
 * - Existing lead must belong to the authenticated user.
 */
router.delete(
  "/:id",
  requirePermission("leads.delete"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead ID",
        });
      }

      const userId = getUserId(req);

      const existingLead = await prisma.lead.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }

      await prisma.lead.delete({
        where: {
          id: existingLead.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Lead deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/leads/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete lead",
      });
    }
  },
);

export default router;