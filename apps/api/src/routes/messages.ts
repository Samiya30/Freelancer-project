import { Router, type Request } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceId,
  requirePermission,
} from "../middleware/permissions.js";

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

const createConversationSchema = z.object({
  clientId: z.number().int().positive(),
  message: z.string().trim().min(1).max(10000),
});

const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(10000),
});

const idSchema = z.coerce.number().int().positive();

async function getConversationForUser(
  conversationId: number,
  userId: number,
  workspaceId: number,
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
      workspaceId,
    },
    include: {
      client: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

/**
 * GET /api/messages/conversations
 *
 * Returns all non-archived conversations belonging to
 * the authenticated user inside the active workspace.
 */
router.get(
  "/conversations",
  requirePermission("messages.view"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversations =
        await prisma.conversation.findMany({
          where: {
            userId,
            workspaceId,
            archived: false,
          },
          include: {
            client: true,
          },
          orderBy: {
            lastTime: "desc",
          },
        });

      return res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error(
        "GET /api/messages/conversations error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch conversations.",
      });
    }
  },
);

/**
 * GET /api/messages/conversations/:id
 *
 * Returns one conversation and all of its messages.
 */
router.get(
  "/conversations/:id",
  requirePermission("messages.view"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      return res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error(
        "GET /api/messages/conversations/:id error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch conversation.",
      });
    }
  },
);

/**
 * POST /api/messages/conversations
 *
 * Creates a conversation for a client and sends the
 * first freelancer message.
 */
router.post(
  "/conversations",
  requirePermission("messages.create"),
  async (req, res) => {
    try {
      const parsed =
        createConversationSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation data.",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const client =
        await prisma.client.findFirst({
          where: {
            id: parsed.data.clientId,
            userId,
            workspaceId,
          },
        });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found.",
        });
      }

      const now = new Date();

      const conversation =
        await prisma.$transaction(
          async (tx) => {
            const createdConversation =
              await tx.conversation.create({
                data: {
                  name: client.name,
                  company: client.company,
                  initials: getInitials(
                    client.name,
                  ),
                  gradient:
                    getConversationGradient(
                      client.id,
                    ),
                  online: false,
                  unread: 0,
                  starred: false,
                  archived: false,
                  lastMessage:
                    parsed.data.message,
                  lastTime: now,
                  workspaceId,
                  userId,
                  clientId: client.id,
                },
              });

            await tx.message.create({
              data: {
                text: parsed.data.message,
                sender: "me",
                time: now,
                read: true,
                conversationId:
                  createdConversation.id,
                userId,
              },
            });

            return createdConversation;
          },
        );

      const result =
        await getConversationForUser(
          conversation.id,
          userId,
          workspaceId,
        );

      return res.status(201).json({
        success: true,
        message:
          "Conversation created successfully.",
        data: result,
      });
    } catch (error) {
      console.error(
        "POST /api/messages/conversations error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create conversation.",
      });
    }
  },
);

/**
 * POST /api/messages/conversations/:id/messages
 *
 * Sends a message from the authenticated freelancer.
 */
router.post(
  "/conversations/:id/messages",
  requirePermission("messages.create"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const parsed =
        sendMessageSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid message data.",
          errors: parsed.error.flatten(),
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      if (conversation.archived) {
        return res.status(400).json({
          success: false,
          message:
            "Archived conversations cannot receive new messages.",
        });
      }

      const now = new Date();

      const result =
        await prisma.$transaction(
          async (tx) => {
            const createdMessage =
              await tx.message.create({
                data: {
                  text: parsed.data.text,
                  sender: "me",
                  time: now,
                  read: true,
                  conversationId:
                    conversation.id,
                  userId,
                },
              });

            await tx.conversation.update({
              where: {
                id: conversation.id,
              },
              data: {
                lastMessage:
                  parsed.data.text,
                lastTime: now,
              },
            });

            return createdMessage;
          },
        );

      return res.status(201).json({
        success: true,
        message:
          "Message sent successfully.",
        data: result,
      });
    } catch (error) {
      console.error(
        "POST /api/messages/conversations/:id/messages error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to send message.",
      });
    }
  },
);

/**
 * PATCH /api/messages/conversations/:id/read
 *
 * Marks all unread messages in a conversation as read.
 */
router.patch(
  "/conversations/:id/read",
  requirePermission("messages.view"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      await prisma.$transaction([
        prisma.message.updateMany({
          where: {
            conversationId:
              conversation.id,
            sender: {
              not: "me",
            },
            read: false,
          },
          data: {
            read: true,
          },
        }),

        prisma.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            unread: 0,
          },
        }),
      ]);

      return res.json({
        success: true,
        message:
          "Conversation marked as read.",
      });
    } catch (error) {
      console.error(
        "PATCH /api/messages/conversations/:id/read error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to mark conversation as read.",
      });
    }
  },
);

/**
 * PATCH /api/messages/conversations/:id/star
 *
 * Toggles the starred state.
 */
router.patch(
  "/conversations/:id/star",
  requirePermission("messages.create"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      const updated =
        await prisma.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            starred: !conversation.starred,
          },
        });

      return res.json({
        success: true,
        message: updated.starred
          ? "Conversation starred."
          : "Conversation unstarred.",
        data: updated,
      });
    } catch (error) {
      console.error(
        "PATCH /api/messages/conversations/:id/star error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update conversation.",
      });
    }
  },
);

/**
 * PATCH /api/messages/conversations/:id/archive
 *
 * Archives a conversation.
 */
router.patch(
  "/conversations/:id/archive",
  requirePermission("messages.create"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      const updated =
        await prisma.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            archived: true,
          },
        });

      return res.json({
        success: true,
        message:
          "Conversation archived successfully.",
        data: updated,
      });
    } catch (error) {
      console.error(
        "PATCH /api/messages/conversations/:id/archive error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to archive conversation.",
      });
    }
  },
);

/**
 * DELETE /api/messages/conversations/:id
 *
 * Deletes a conversation and its messages.
 */
router.delete(
  "/conversations/:id",
  requirePermission("messages.delete"),
  async (req, res) => {
    try {
      const parsedId = idSchema.safeParse(
        req.params.id,
      );

      if (!parsedId.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID.",
        });
      }

      const userId = getUserId(req);
      const workspaceId = await getWorkspaceId(userId);

      if (workspaceId === null) {
        return res.status(403).json({
          success: false,
          message: "No active workspace membership found.",
        });
      }

      const conversation =
        await getConversationForUser(
          parsedId.data,
          userId,
          workspaceId,
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found.",
        });
      }

      await prisma.conversation.delete({
        where: {
          id: conversation.id,
        },
      });

      return res.json({
        success: true,
        message:
          "Conversation deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/messages/conversations/:id error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete conversation.",
      });
    }
  },
);

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0];

  if (!first) {
    return "?";
  }

  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }

  const last = parts[parts.length - 1];

  if (!last) {
    return first.slice(0, 2).toUpperCase();
  }

  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function getConversationGradient(
  clientId: number,
): string {
  const gradients: string[] = [
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-indigo-500 to-purple-500",
  ];

  const index =
    Math.abs(clientId) %
    gradients.length;

  return gradients[index] ?? gradients[0]!;
}