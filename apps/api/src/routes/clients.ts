import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

const router = Router();

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().min(2, "Company is required"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  projects: z.number().int().min(0).default(0),
  totalRevenue: z.number().min(0).default(0),
});

const updateClientSchema = clientSchema.partial();

/*
 * Authentication applies to every client route.
 */
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
 * GET /api/clients
 *
 * Permission required:
 * clients.view
 */
router.get(
  "/",
  requirePermission("clients.view"),
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

      const clients = await prisma.client.findMany({
        where: {
          userId,
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        data: clients,
      });
    } catch (error) {
      console.error("GET /api/clients error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch clients",
      });
    }
  },
);

/**
 * GET /api/clients/:id
 *
 * Permission required:
 * clients.view
 */
router.get(
  "/:id",
  requirePermission("clients.view"),
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

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID",
        });
      }

      const client = await prisma.client.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      console.error("GET /api/clients/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch client",
      });
    }
  },
);

/**
 * POST /api/clients
 *
 * Permission required:
 * clients.create
 */
router.post(
  "/",
  requirePermission("clients.create"),
  async (req, res) => {
    try {
      const result = clientSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.flatten(),
        });
      }

      const data = result.data;
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found",
        });
      }

      const client = await prisma.client.create({
        data: {
          name: data.name,
          email: data.email,
          company: data.company,
          status: data.status,
          projects: data.projects,
          totalRevenue: data.totalRevenue,
          userId,
          workspaceId,
          ...(data.phone !== undefined && {
            phone: data.phone,
          }),
        },
      });

      return res.status(201).json({
        success: true,
        message: "Client created successfully",
        data: client,
      });
    } catch (error) {
      console.error("POST /api/clients error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create client",
      });
    }
  },
);

/**
 * PATCH /api/clients/:id
 *
 * Permission required:
 * clients.update
 */
router.patch(
  "/:id",
  requirePermission("clients.update"),
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

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID",
        });
      }

      const result = updateClientSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.flatten(),
        });
      }

      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }

      const updateData = Object.fromEntries(
        Object.entries(result.data).filter(
          ([, value]) => value !== undefined,
        ),
      );

      const client = await prisma.client.update({
        where: {
          id: existingClient.id,
        },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Client updated successfully",
        data: client,
      });
    } catch (error) {
      console.error("PATCH /api/clients/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update client",
      });
    }
  },
);

/**
 * DELETE /api/clients/:id
 *
 * Permission required:
 * clients.delete
 */
router.delete(
  "/:id",
  requirePermission("clients.delete"),
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

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid client ID",
        });
      }

      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          userId,
          workspaceId,
        },
      });

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }

      await prisma.client.delete({
        where: {
          id: existingClient.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Client deleted successfully",
      });
    } catch (error) {
      console.error("DELETE /api/clients/:id error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete client",
      });
    }
  },
);

export default router;