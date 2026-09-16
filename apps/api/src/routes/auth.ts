import { Router } from "express";
import {
  AuditAction,
  PermissionEffect,
  WorkspaceMemberStatus,
} from "@prisma/client";

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

const permissionDefinitions = [
  // Dashboard
  ["dashboard.view", "View Dashboard", "View the workspace dashboard", "Dashboard"],

  // Clients
  ["clients.view", "View Clients", "View clients", "Clients"],
  ["clients.create", "Create Clients", "Create clients", "Clients"],
  ["clients.update", "Update Clients", "Update clients", "Clients"],
  ["clients.delete", "Delete Clients", "Delete clients", "Clients"],

  // Leads
  ["leads.view", "View Leads", "View leads", "Leads"],
  ["leads.create", "Create Leads", "Create leads", "Leads"],
  ["leads.update", "Update Leads", "Update leads", "Leads"],
  ["leads.delete", "Delete Leads", "Delete leads", "Leads"],

  // Proposals
  ["proposals.view", "View Proposals", "View proposals", "Proposals"],
  ["proposals.create", "Create Proposals", "Create proposals", "Proposals"],
  ["proposals.update", "Update Proposals", "Update proposals", "Proposals"],
  ["proposals.delete", "Delete Proposals", "Delete proposals", "Proposals"],

  // Contracts
  ["contracts.view", "View Contracts", "View contracts", "Contracts"],
  ["contracts.create", "Create Contracts", "Create contracts", "Contracts"],
  ["contracts.update", "Update Contracts", "Update contracts", "Contracts"],
  ["contracts.delete", "Delete Contracts", "Delete contracts", "Contracts"],

  // Projects
  ["projects.view", "View Projects", "View projects", "Projects"],
  ["projects.create", "Create Projects", "Create projects", "Projects"],
  ["projects.update", "Update Projects", "Update projects", "Projects"],
  ["projects.delete", "Delete Projects", "Delete projects", "Projects"],

  // Tasks
  ["tasks.view", "View Tasks", "View tasks", "Tasks"],
  ["tasks.create", "Create Tasks", "Create tasks", "Tasks"],
  ["tasks.update", "Update Tasks", "Update tasks", "Tasks"],
  ["tasks.delete", "Delete Tasks", "Delete tasks", "Tasks"],

  // Time
  ["time.view", "View Time Entries", "View time entries", "Time"],
  ["time.create", "Create Time Entries", "Create time entries", "Time"],
  ["time.update", "Update Time Entries", "Update time entries", "Time"],
  ["time.delete", "Delete Time Entries", "Delete time entries", "Time"],

  // Invoices
  ["invoices.view", "View Invoices", "View invoices", "Invoices"],
  ["invoices.create", "Create Invoices", "Create invoices", "Invoices"],
  ["invoices.update", "Update Invoices", "Update invoices", "Invoices"],
  ["invoices.delete", "Delete Invoices", "Delete invoices", "Invoices"],

  // Payments
  ["payments.view", "View Payments", "View payments", "Payments"],
  ["payments.create", "Create Payments", "Create payments", "Payments"],
  ["payments.update", "Update Payments", "Update payments", "Payments"],
  ["payments.delete", "Delete Payments", "Delete payments", "Payments"],

  // Expenses
  ["expenses.view", "View Expenses", "View expenses", "Expenses"],
  ["expenses.create", "Create Expenses", "Create expenses", "Expenses"],
  ["expenses.update", "Update Expenses", "Update expenses", "Expenses"],
  ["expenses.delete", "Delete Expenses", "Delete expenses", "Expenses"],

  // Files
  ["files.view", "View Files", "View files", "Files"],
  ["files.create", "Upload Files", "Upload files", "Files"],
  ["files.update", "Update Files", "Update file metadata", "Files"],
  ["files.delete", "Delete Files", "Delete files", "Files"],

  // Messages
  ["messages.view", "View Messages", "View conversations and messages", "Messages"],
  ["messages.create", "Send Messages", "Send messages", "Messages"],
  ["messages.delete", "Delete Messages", "Delete messages", "Messages"],

  // Reports
  ["reports.view", "View Reports", "View reports", "Reports"],

  // Settings
  ["settings.view", "View Settings", "View workspace settings", "Settings"],
  ["settings.update", "Update Settings", "Update workspace settings", "Settings"],

  // Team
  ["members.view", "View Team Members", "View workspace members", "Team"],
  ["members.invite", "Invite Team Members", "Invite users to the workspace", "Team"],
  ["members.update", "Update Team Members", "Update member details", "Team"],
  ["members.remove", "Remove Team Members", "Remove members from the workspace", "Team"],
  ["members.suspend", "Suspend Team Members", "Suspend or restore members", "Team"],

  // Roles
  ["roles.view", "View Roles", "View workspace roles", "Roles"],
  ["roles.create", "Create Roles", "Create custom roles", "Roles"],
  ["roles.update", "Update Roles", "Update custom roles", "Roles"],
  ["roles.delete", "Delete Roles", "Delete custom roles", "Roles"],

  // Permissions
  ["permissions.view", "View Permissions", "View available permissions", "Permissions"],
  ["permissions.grant", "Grant Permissions", "Grant member permissions", "Permissions"],
  ["permissions.revoke", "Revoke Permissions", "Revoke member permissions", "Permissions"],

  // Security
  ["audit.view", "View Audit Log", "View workspace audit history", "Security"],

  // Workspace
  ["workspace.update", "Update Workspace", "Update workspace information", "Workspace"],
  ["workspace.delete", "Delete Workspace", "Delete the workspace", "Workspace"],
  ["ownership.transfer", "Transfer Ownership", "Transfer workspace ownership", "Workspace"],
] as const;

const operationalPrefixes = [
  "dashboard.",
  "clients.",
  "leads.",
  "proposals.",
  "contracts.",
  "projects.",
  "tasks.",
  "time.",
  "invoices.",
  "payments.",
  "expenses.",
  "files.",
  "messages.",
];

const roleDescriptions: Record<string, string> = {
  Owner: "Full control over the workspace",
  Admin: "High-level workspace administration",
  "Team Lead": "Manage operational work and team activity",
  "Team Member": "Standard operational workspace access",
  Client: "Restricted client portal access",
};

function getRolePermissionKeys(
  roleName: string,
  allKeys: string[],
): string[] {
  if (roleName === "Owner") {
    return allKeys;
  }

  const operational = allKeys.filter((key) =>
    operationalPrefixes.some((prefix) =>
      key.startsWith(prefix),
    ),
  );

  if (roleName === "Admin") {
    return [
      ...operational,
      "reports.view",
      "settings.view",
      "settings.update",
      "members.view",
      "members.invite",
      "members.update",
      "members.remove",
      "members.suspend",
      "roles.view",
      "roles.create",
      "roles.update",
      "permissions.view",
      "permissions.grant",
      "permissions.revoke",
      "audit.view",
      "workspace.update",
    ];
  }

  if (roleName === "Team Lead") {
    return [
      ...operational,
      "reports.view",
      "members.view",
      "members.update",
      "members.suspend",
      "audit.view",
    ];
  }

  if (roleName === "Team Member") {
    return operational.filter(
      (key) =>
        key.endsWith(".view") ||
        key.endsWith(".create") ||
        key.endsWith(".update"),
    );
  }

  return [
    "dashboard.view",
    "clients.view",
    "projects.view",
    "tasks.view",
    "invoices.view",
    "payments.view",
    "files.view",
    "messages.view",
  ];
}

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
    // Temporary compatibility field.
    // Workspace RBAC is authoritative.
    role: user.role,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function bootstrapWorkspace(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: number,
  workspaceName: string,
  workspaceSlug: string,
) {
  const workspace = await tx.workspace.create({
    data: {
      name: workspaceName,
      slug: workspaceSlug,
      description: "FreelanceOS workspace",
      ownerId: userId,
    },
  });

  const permissionMap = new Map<string, number>();

  for (const [
    key,
    name,
    description,
    category,
  ] of permissionDefinitions) {
    const permission = await tx.permission.create({
      data: {
        workspaceId: workspace.id,
        key,
        name,
        description,
        category,
      },
    });

    permissionMap.set(key, permission.id);
  }

  const roleNames = [
    "Owner",
    "Admin",
    "Team Lead",
    "Team Member",
    "Client",
  ];

  const roleMap = new Map<string, number>();

  for (const roleName of roleNames) {
    const role = await tx.role.create({
      data: {
        workspaceId: workspace.id,
        name: roleName,
        description: roleDescriptions[roleName] ?? "",
        isSystem: true,
        createdById: userId,
      },
    });

    roleMap.set(roleName, role.id);
  }

  const allPermissionKeys =
    permissionDefinitions.map(([key]) => key);

  for (const roleName of roleNames) {
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      throw new Error(
        `Failed to create ${roleName} role`,
      );
    }

    const allowedKeys =
      getRolePermissionKeys(
        roleName,
        allPermissionKeys,
      );

    for (const key of allowedKeys) {
      const permissionId =
        permissionMap.get(key);

      if (!permissionId) {
        throw new Error(
          `Failed to create permission mapping for ${key}`,
        );
      }

      await tx.rolePermission.create({
        data: {
          roleId,
          permissionId,
          effect: PermissionEffect.Allow,
        },
      });
    }
  }

  const ownerRoleId = roleMap.get("Owner");

  if (!ownerRoleId) {
    throw new Error(
      "Owner role failed to initialize",
    );
  }

  const member =
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        roleId: ownerRoleId,
        status: WorkspaceMemberStatus.Active,
      },
      include: {
        role: true,
        workspace: true,
      },
    });

  await tx.auditLog.create({
    data: {
      action: AuditAction.Created,
      entityType: "Workspace",
      entityId: String(workspace.id),
      description:
        "Workspace created during registration.",
      metadata: {
        workspaceName: workspace.name,
        ownerUserId: userId,
      },
      workspaceId: workspace.id,
      actorId: userId,
      memberId: member.id,
    },
  });

  return {
    workspace,
    member,
  };
}

/**
 * POST /api/auth/register
 */
router.post(
  "/register",
  async (req, res, next) => {
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
          message:
            "Name, email and password are required",
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
                      industry: "Technology",
                      timezone: "Asia/Kolkata",
                      currency: "INR",
                    },
                  },
                },
              });

            const workspaceSlug =
              `${normalizedEmail
                .split("@")[0]!
                .replace(
                  /[^a-z0-9]+/g,
                  "-",
                )
                .replace(
                  /^-+|-+$/g,
                  "",
                )}-${user.id}`;

            const { workspace, member } =
              await bootstrapWorkspace(
                tx,
                user.id,
                `${normalizedName}'s Workspace`,
                workspaceSlug,
              );

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

      if (!authorization) {
        // This should never happen because
        // registration creates an active owner membership.
        await deleteSession(session.id);

        res.status(500).json({
          success: false,
          message:
            "Account authorization could not be initialized",
        });
        return;
      }

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
  },
);

/**
 * POST /api/auth/login
 */
router.post(
  "/login",
  async (req, res, next) => {
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

      const authorization =
        await getAuthorizationContext(
          user.id,
        );

      if (!authorization) {
        res.status(403).json({
          success: false,
          message:
            "Active workspace membership not found",
        });
        return;
      }

      if (
        authorization.status !==
        "Active"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Your workspace membership is not active",
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
  },
);

/**
 * GET /api/auth/me
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

      if (
        authorization.status !==
        "Active"
      ) {
        res.status(403).json({
          success: false,
          message:
            "Your workspace membership is not active",
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