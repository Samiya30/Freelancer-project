"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckSquare,
  Clock3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  Users,
  Wallet,
  UserRoundSearch,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

type NavigationItem = {
  name: string;
  icon: typeof LayoutDashboard;
  href: string;
  permission?: string;
};

const navigation: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        name: "Leads",
        icon: UserRoundSearch,
        href: "/leads",
        permission: "leads.view",
      },
      {
        name: "Clients",
        icon: Users,
        href: "/clients",
        permission: "clients.view",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        name: "Proposals",
        icon: FileText,
        href: "/proposals",
        permission: "proposals.view",
      },
      {
        name: "Contracts",
        icon: BriefcaseBusiness,
        href: "/contracts",
        permission: "contracts.view",
      },
    ],
  },
  {
    label: "Delivery",
    items: [
      {
        name: "Projects",
        icon: FolderKanban,
        href: "/projects",
        permission: "projects.view",
      },
      {
        name: "Tasks",
        icon: CheckSquare,
        href: "/tasks",
        permission: "tasks.view",
      },
      {
        name: "Time",
        icon: Clock3,
        href: "/time",
        permission: "time.view",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        name: "Invoices",
        icon: Receipt,
        href: "/invoices",
        permission: "invoices.view",
      },
      {
        name: "Payments",
        icon: Wallet,
        href: "/payments",
        permission: "payments.view",
      },
      {
        name: "Expenses",
        icon: BarChart3,
        href: "/expenses",
        permission: "expenses.view",
      },
    ],
  },
];

const workspaceItems: NavigationItem[] = [
  {
    name: "Files",
    icon: FileText,
    href: "/files",
    permission: "files.view",
  },
  {
    name: "Reports",
    icon: BarChart3,
    href: "/reports",
    permission: "reports.view",
  },
  {
    name: "Team",
    icon: Users,
    href: "/team",
    permission: "members.view",
  },
  {
    name: "Settings",
    icon: Settings,
    href: "/settings",
    permission: "settings.view",
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const isVisible = (item: NavigationItem) =>
    !item.permission || hasPermission(item.permission);

  const visibleNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter(isVisible),
    }))
    .filter((section) => section.items.length > 0);

  const visibleWorkspaceItems =
    workspaceItems.filter(isVisible);

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              F
            </div>

            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                FreelanceOS
              </h1>

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Business OS
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {visibleNavigation.map((section) => (
            <div
              key={section.label}
              className="mb-6"
            >
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition
                        ${
                          active
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }
                      `}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                      />

                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Workspace */}
          {visibleWorkspaceItems.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Workspace
              </p>

              <div className="space-y-1">
                {visibleWorkspaceItems.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition
                        ${
                          active
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }
                      `}
                    >
                      <Icon size={18} />
                      {item.name}
                    </Link>
                  );
                })}

                {/* Messages currently has no backend route,
                    so it remains outside the permission system. */}
                <Link
                  href="/messages"
                  onClick={onClose}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                    text-sm font-medium transition
                    ${
                      pathname === "/messages" ||
                      pathname.startsWith("/messages/")
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  <MessageSquare size={18} />
                  Messages
                </Link>
              </div>
            </div>
          )}

          {/* Upgrade */}
          <div className="mb-2 mt-auto">
            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-sm font-semibold">
                Upgrade to Pro
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-300">
                Unlock unlimited clients, projects and invoices.
              </p>

              <button className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100">
                View plans
              </button>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}