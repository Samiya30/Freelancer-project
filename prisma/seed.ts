import "dotenv/config";
import {
  PrismaClient,
  PermissionEffect,
  WorkspaceMemberStatus,
  AuditAction,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const OWNER_EMAIL = "samiyasharma08@gmail.com";

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

function getRolePermissionKeys(
  roleName: string,
  allKeys: string[],
): string[] {
  // Owner gets everything.
  if (roleName === "Owner") {
    return allKeys;
  }

  const operational = allKeys.filter((key) =>
    operationalPrefixes.some((prefix) => key.startsWith(prefix)),
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

  // Client role is intentionally restricted.
  // The actual client portal will be implemented separately.
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

async function main() {
  console.log("Starting FreelanceOS RBAC seed...");

  // ---------------------------------------------------------
  // 1. Find the initial owner
  // ---------------------------------------------------------

  const owner = await prisma.user.findUnique({
    where: {
      email: OWNER_EMAIL,
    },
  });

  if (!owner) {
    throw new Error(
      `Owner user not found: ${OWNER_EMAIL}`,
    );
  }

  console.log(`Owner: ${owner.email}`);

  // ---------------------------------------------------------
  // 2. Create or find the workspace
  // ---------------------------------------------------------

  const workspaceSlug = "freelanceos-workspace";

  let workspace = await prisma.workspace.findUnique({
    where: {
      slug: workspaceSlug,
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "FreelanceOS Workspace",
        slug: workspaceSlug,
        description: "Main FreelanceOS workspace",
        ownerId: owner.id,
      },
    });

    console.log(`Created workspace: ${workspace.name}`);

    await prisma.auditLog.create({
      data: {
        action: AuditAction.Created,
        entityType: "Workspace",
        entityId: String(workspace.id),
        description: "Workspace created during RBAC initialization",
        workspaceId: workspace.id,
        actorId: owner.id,
      },
    });
  } else if (workspace.ownerId !== owner.id) {
    throw new Error(
      `Workspace already exists but has a different owner. Expected ${OWNER_EMAIL}.`,
    );
  } else {
    console.log(`Workspace already exists: ${workspace.name}`);
  }

  // ---------------------------------------------------------
  // 3. Create permissions
  // ---------------------------------------------------------

  const permissionMap = new Map<string, number>();

  for (const [
    key,
    name,
    description,
    category,
  ] of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: {
        workspaceId_key: {
          workspaceId: workspace.id,
          key,
        },
      },
      update: {
        name,
        description,
        category,
      },
      create: {
        workspaceId: workspace.id,
        key,
        name,
        description,
        category,
      },
    });

    permissionMap.set(key, permission.id);
  }

  console.log(
    `Created/updated ${permissionDefinitions.length} permissions.`,
  );

  // ---------------------------------------------------------
  // 4. Create built-in roles
  // ---------------------------------------------------------

  const roleNames = [
    "Owner",
    "Admin",
    "Team Lead",
    "Team Member",
    "Client",
  ];

  const roleMap = new Map<string, number>();

  for (const roleName of roleNames) {
    const descriptions: Record<string, string> = {
      Owner: "Full control over the workspace",
      Admin: "High-level workspace administration",
      "Team Lead": "Manage operational work and team activity",
      "Team Member": "Standard operational workspace access",
      Client: "Restricted client portal access",
    };

    const role = await prisma.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: roleName,
        },
      },
      update: {
        description: descriptions[roleName],
        isSystem: true,
      },
      create: {
        workspaceId: workspace.id,
        name: roleName,
        description: descriptions[roleName],
        isSystem: true,
        createdById: owner.id,
      },
    });

    roleMap.set(roleName, role.id);

    console.log(`Role ready: ${roleName}`);
  }

  // ---------------------------------------------------------
  // 5. Assign permissions to roles
  // ---------------------------------------------------------

  const allPermissionKeys = permissionDefinitions.map(
    ([key]) => key,
  );

  for (const roleName of roleNames) {
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const allowedKeys = getRolePermissionKeys(
      roleName,
      allPermissionKeys,
    );

    for (const key of allowedKeys) {
      const permissionId = permissionMap.get(key);

      if (!permissionId) {
        throw new Error(
          `Permission not found: ${key}`,
        );
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {
          effect: PermissionEffect.Allow,
        },
        create: {
          roleId,
          permissionId,
          effect: PermissionEffect.Allow,
        },
      });
    }

    console.log(
      `${roleName}: ${allowedKeys.length} permissions`,
    );
  }

  // ---------------------------------------------------------
  // 6. Create memberships for existing users
  // ---------------------------------------------------------

  const users = await prisma.user.findMany({
    orderBy: {
      id: "asc",
    },
  });

  const ownerRoleId = roleMap.get("Owner");
  const teamMemberRoleId = roleMap.get("Team Member");

  if (!ownerRoleId || !teamMemberRoleId) {
    throw new Error("Required roles were not created.");
  }

  for (const user of users) {
    const isOwner = user.id === owner.id;

    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {
        roleId: isOwner
          ? ownerRoleId
          : teamMemberRoleId,
        status: WorkspaceMemberStatus.Active,
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        roleId: isOwner
          ? ownerRoleId
          : teamMemberRoleId,
        status: WorkspaceMemberStatus.Active,
      },
      include: {
        role: true,
        user: true,
      },
    });

    console.log(
      `Member ready: ${member.user.email} → ${member.role.name}`,
    );

    const existingAudit = await prisma.auditLog.findFirst({
      where: {
        workspaceId: workspace.id,
        memberId: member.id,
        entityType: "WorkspaceMember",
        entityId: String(member.id),
      },
    });

    if (!existingAudit) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.Created,
          entityType: "WorkspaceMember",
          entityId: String(member.id),
          description: isOwner
            ? "Initial workspace owner membership created"
            : "Initial team membership created",
          workspaceId: workspace.id,
          actorId: owner.id,
          memberId: member.id,
        },
      });
    }
  }

  console.log("");
  console.log("======================================");
  console.log("FreelanceOS RBAC seed completed.");
  console.log("======================================");
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Owner: ${owner.email}`);
  console.log(`Users: ${users.length}`);
  console.log(`Permissions: ${permissionDefinitions.length}`);
  console.log(`Roles: ${roleNames.length}`);
}

main()
  .catch((error) => {
    console.error("RBAC seed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });