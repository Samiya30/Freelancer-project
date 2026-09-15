import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionCookieName,
  getSessionCookieOptions,
  hashPassword,
  verifyPassword,
} from "../lib/auth.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { getAuthorizationContext } from "../middleware/permissions.js";

const router = Router();

function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    // Kept temporarily for backward compatibility.
    // Workspace RBAC is the authoritative role system.
    role: user.role,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * POST /api/auth/register
 *
 * Creates:
 * User
 * Settings
 * Workspace
 * Owner WorkspaceMember
 * Owner RBAC membership
 * Session
 */
router.post("/register", async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      firstName = "",
      lastName = "",
      phone = "",
    } = req.body as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      phone?: unknown;
    };

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedName =
      name.trim();

    if (!normalizedName) {
      res.status(400).json({
        success: false,
        message: "Name is required",
      });
      return;
    }

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid email address is required",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters",
      });
      return;
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
      return;
    }

    const passwordHash =
      await hashPassword(password);

    const ownerRole =
      await prisma.role.findFirst({
        where: {
          name: "Owner",
          isSystem: true,
        },
      });

    if (!ownerRole) {
      res.status(500).json({
        success: false,
        message:
          "Owner role is not configured. Please contact support.",
      });
      return;
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                name: normalizedName,
                email: normalizedEmail,
                password: passwordHash,
                firstName:
                  typeof firstName === "string"
                    ? firstName.trim()
                    : normalizedName
                        .split(" ")[0] || "",
                lastName:
                  typeof lastName === "string"
                    ? lastName.trim()
                    : normalizedName
                        .split(" ")
                        .slice(1)
                        .join(" "),
                phone:
                  typeof phone === "string"
                    ? phone.trim()
                    : "",
                settings: {
                  create: {
                    workspaceName:
                      `${normalizedName}'s Workspace`,
                    website: "",
                    industry:
                      "Technology",
                    timezone:
                      "Asia/Kolkata",
                    currency: "INR",
                  },
                },
              },
            });

          const workspace =
            await tx.workspace.create({
              data: {
                name:
                  `${normalizedName}'s Workspace`,
               slug: `${normalizedEmail
                  .split("@")[0]!
                  .replace(
                    /[^a-z0-9]+/g,
                    "-",
                  )
                  .replace(
                    /^-+|-+$/g,
                    "",
                  )}-${user.id}`,
                description:
                  "FreelanceOS workspace",
                ownerId: user.id,
              },
            });

          const member =
            await tx.workspaceMember.create({
              data: {
                workspaceId:
                  workspace.id,
                userId: user.id,
                roleId: ownerRole.id,
                status: "Active",
              },
              include: {
                role: true,
                workspace: true,
              },
            });

          await tx.auditLog.create({
            data: {
              action: "Created",
              entityType:
                "Workspace",
              entityId:
                String(workspace.id),
              description:
                "Workspace created during registration.",
              metadata: {
                workspaceName:
                  workspace.name,
                ownerUserId:
                  user.id,
              },
              workspaceId:
                workspace.id,
              actorId:
                user.id,
              memberId:
                member.id,
            },
          });

          return {
            user,
            workspace,
            member,
          };
        },
      );

    const session =
      await createSession(
        result.user.id,
      );

    res.cookie(
      getSessionCookieName(),
      session.id,
      getSessionCookieOptions(),
    );

    const authorization =
      await getAuthorizationContext(
        result.user.id,
      );

    res.status(201).json({
      success: true,
      message:
        "Account created successfully",
      data: {
        user:
          sanitizeUser(
            result.user,
          ),
        authorization,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res, next) => {
  try {
    const {
      email,
      password,
    } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
      return;
    }

    const passwordValid =
      await verifyPassword(
        password,
        user.password,
      );

    if (!passwordValid) {
      res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
      return;
    }

    const session =
      await createSession(user.id);

    res.cookie(
      getSessionCookieName(),
      session.id,
      getSessionCookieOptions(),
    );

    const authorization =
      await getAuthorizationContext(
        user.id,
      );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user:
          sanitizeUser(user),
        authorization,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 *
 * Returns authenticated user plus
 * workspace RBAC authorization context.
 */
router.get(
  "/me",
  requireAuth,
  async (req, res, next) => {
    try {
      const authenticatedReq =
        req as AuthenticatedRequest;

      const user =
        await prisma.user.findUnique({
          where: {
            id: authenticatedReq.userId,
          },
        });

      if (!user) {
        res.status(401).json({
          success: false,
          message:
            "User account not found",
        });
        return;
      }

      const authorization =
        await getAuthorizationContext(
          authenticatedReq.userId,
        );

      if (!authorization) {
        res.status(403).json({
          success: false,
          message:
            "Active workspace membership not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user:
            sanitizeUser(user),
          authorization,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/auth/logout
 */
router.post(
  "/logout",
  async (req, res, next) => {
    try {
      const sessionId =
        req.cookies?.[
          getSessionCookieName()
        ];

      if (sessionId) {
        await deleteSession(
          sessionId,
        );
      }

      res.clearCookie(
        getSessionCookieName(),
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          path: "/",
        },
      );

      res.status(200).json({
        success: true,
        message:
          "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;