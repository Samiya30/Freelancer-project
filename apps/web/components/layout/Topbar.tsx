"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();

  const displayName =
    user?.firstName ||
    user?.name ||
    "Freelancer";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "F";

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex md:w-72">
          <Search size={17} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />

          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:block">
            ⌘ K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="relative ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {initials}
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-400">
              {user?.role || "Freelancer"}
            </p>
          </div>

          <details className="group relative hidden sm:block">
            <summary className="flex cursor-pointer list-none items-center rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <ChevronDown
                size={15}
                className="transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="absolute right-0 top-9 z-50 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}