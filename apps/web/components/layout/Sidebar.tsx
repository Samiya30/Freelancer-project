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

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
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
      },
      {
        name: "Clients",
        icon: Users,
        href: "/clients",
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
      },
      {
        name: "Contracts",
        icon: BriefcaseBusiness,
        href: "/contracts",
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
      },
      {
        name: "Tasks",
        icon: CheckSquare,
        href: "/tasks",
      },
      {
        name: "Time",
        icon: Clock3,
        href: "/time",
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
      },
      {
        name: "Payments",
        icon: Wallet,
        href: "/payments",
      },
      {
        name: "Expenses",
        icon: BarChart3,
        href: "/expenses",
      },
    ],
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

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
          {navigation.map((section) => (
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
          <div className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>

            <div className="space-y-1">
              <Link
                href="/messages"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <MessageSquare size={18} />
                Messages
              </Link>

              <Link
                href="/files"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <FileText size={18} />
                Files
              </Link>

              <Link
                href="/reports"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <BarChart3 size={18} />
                Reports
              </Link>

              <Link
                href="/settings"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <Settings size={18} />
                Settings
              </Link>
            </div>
          </div>
        </nav>

        {/* Upgrade */}
        <div className="border-t border-slate-200 p-4">
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
      </aside>
    </>
  );
}