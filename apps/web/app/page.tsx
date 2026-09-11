"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "../components/layout/AppShell";
import {
  getDashboard,
  type DashboardData,
  type DashboardProject,
  type DashboardInvoice,
} from "../lib/api/dashboard";

const quickActions = [
  {
    label: "Add Client",
    description: "Create a new client",
    icon: Users,
    href: "/clients",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=160&q=80",
    bg: "bg-blue-50",
    iconBg: "bg-blue-600",
  },
  {
    label: "Create Proposal",
    description: "Send a new proposal",
    icon: FileText,
    href: "/proposals",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=160&q=80",
    bg: "bg-violet-50",
    iconBg: "bg-violet-600",
  },
  {
    label: "Create Invoice",
    description: "Bill a client",
    icon: Receipt,
    href: "/invoices",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=160&q=80",
    bg: "bg-amber-50",
    iconBg: "bg-amber-500",
  },
  {
    label: "Create Project",
    description: "Start new work",
    icon: BriefcaseBusiness,
    href: "/projects",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=160&q=80",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-600",
  },
  {
    label: "Track Time",
    description: "Log working hours",
    icon: Clock3,
    href: "/time",
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=160&q=80",
    bg: "bg-sky-50",
    iconBg: "bg-sky-600",
  },
];

const projectVisuals = [
  {
    accent: "bg-blue-600",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=500&q=80",
  },
  {
    accent: "bg-violet-500",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=500&q=80",
  },
  {
    accent: "bg-emerald-500",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80",
  },
  {
    accent: "bg-sky-500",
    image:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=500&q=80",
  },
];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getProjectStatusLabel(status: string) {
  switch (status) {
    case "InProgress":
      return "In Progress";
    case "OnHold":
      return "On Hold";
    case "ToDo":
      return "To Do";
    default:
      return status;
  }
}

function getProjectVisual(index: number) {
  return projectVisuals[index % projectVisuals.length];
}

function getInvoiceStatusClasses(status: string) {
  switch (status) {
    case "Paid":
      return {
        wrapper: "bg-emerald-100",
        icon: "text-emerald-600",
        text: "text-emerald-600",
      };

    case "Overdue":
      return {
        wrapper: "bg-red-100",
        icon: "text-red-500",
        text: "text-red-500",
      };

    case "Viewed":
      return {
        wrapper: "bg-blue-100",
        icon: "text-blue-600",
        text: "text-blue-600",
      };

    default:
      return {
        wrapper: "bg-amber-100",
        icon: "text-amber-600",
        text: "text-amber-600",
      };
  }
}

function getProjectStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700";

    case "Review":
      return "bg-violet-100 text-violet-700";

    case "InProgress":
      return "bg-blue-100 text-blue-700";

    case "OnHold":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function buildCsv(
  data: DashboardData,
  selectedYear: number,
) {
  const rows: Array<Array<string | number>> = [
    ["Metric", "Value"],
    [
      "Revenue this month",
      formatCurrency(data.stats.revenueThisMonth),
    ],
    [
      "Outstanding invoices",
      formatCurrency(data.stats.outstandingInvoices),
    ],
    [
      "Outstanding invoice count",
      data.stats.outstandingInvoiceCount,
    ],
    ["Active clients", data.stats.activeClients],
    ["Hours worked", data.stats.hoursWorked],
    [],
    ["Project", "Client", "Progress", "Budget", "Status"],
    ...data.projects.map((project) => [
      project.name,
      project.client,
      `${project.progress}%`,
      formatCurrency(project.budget),
      getProjectStatusLabel(project.status),
    ]),
    [],
    ["Invoice", "Client", "Amount", "Status", "Issue Date"],
    ...data.invoices.map((invoice) => [
      invoice.number,
      invoice.client,
      formatCurrency(invoice.amount),
      invoice.status,
      formatDate(invoice.issueDate),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}

export default function Dashboard() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response =
          await getDashboard(selectedYear);

        if (cancelled) {
          return;
        }

        if (!response.success || !response.data) {
          throw new Error(
            response.message ||
              "Failed to load dashboard.",
          );
        }

        setData(response.data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.revenue.monthly;
  }, [data]);

  const maxRevenue = useMemo(() => {
    const max = Math.max(...chartData, 0);

    return max > 0 ? max : 1;
  }, [chartData]);

  const handleExport = () => {
    if (!data) {
      return;
    }

    const csv = buildCsv(
      data,
      selectedYear,
    );

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `freelanceos-dashboard-${selectedYear}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const projects =
    data?.projects ?? [];

  const invoices =
    data?.invoices ?? [];

  const displayedProjects =
    projects.slice(0, 4);

  const displayedInvoices =
    invoices.slice(0, 4);

  const greetingName = "Samiya";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
        {/* HERO */}
        <section className="relative mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 shadow-sm">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />

          <div className="absolute bottom-[-100px] right-[28%] h-56 w-56 rounded-full bg-violet-200/30 blur-3xl" />

          <div className="absolute left-[45%] top-[-80px] h-40 w-40 rounded-full bg-emerald-100/40 blur-3xl" />

          <div className="absolute right-0 top-0 hidden h-full w-[42%] overflow-hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=80"
              alt=""
              className="h-full w-full object-cover opacity-90"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white/60 to-white/10" />
          </div>

          <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur">
                <Sparkles size={13} />
                Your freelance workspace
              </div>

              <p className="text-sm font-medium text-slate-500">
                {new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                ).format(new Date())}
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Good evening, {greetingName}
                <span className="ml-2">👋</span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Here&apos;s a clear view of your
                projects, clients, revenue, and
                billing activity.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  View projects
                  <ArrowUpRight size={15} />
                </Link>

                <Link
                  href="/reports"
                  className="inline-flex items-center gap-2 rounded-lg border border-white bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                >
                  View reports
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HEADER ACTIONS */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Business overview
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Everything important, in one place.
            </p>
          </div>

          <div className="relative flex gap-2">
            <button
              onClick={handleExport}
              disabled={!data}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export
            </button>

            <button
              onClick={() =>
                setCreateOpen(
                  (value) => !value,
                )
              }
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
            >
              + Create
            </button>

            {createOpen && (
              <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Create new
                </p>

                {quickActions
                  .slice(0, 4)
                  .map((action) => {
                    const ActionIcon =
                      action.icon;

                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        onClick={() =>
                          setCreateOpen(false)
                        }
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <ActionIcon size={16} />
                        {action.label}
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Revenue this month",
              value: data
                ? formatCurrency(
                    data.stats
                      .revenueThisMonth,
                  )
                : "—",
              change: data
                ? "Current month"
                : "Loading...",
              icon: "₹",
              iconClass:
                "bg-blue-100 text-blue-700",
              accent: "bg-blue-600",
            },
            {
              label: "Outstanding invoices",
              value: data
                ? formatCurrency(
                    data.stats
                      .outstandingInvoices,
                  )
                : "—",
              change: data
                ? `${data.stats.outstandingInvoiceCount} invoice${
                    data.stats
                      .outstandingInvoiceCount ===
                    1
                      ? ""
                      : "s"
                  }`
                : "Loading...",
              icon: Receipt,
              iconClass:
                "bg-amber-100 text-amber-700",
              accent: "bg-amber-500",
            },
            {
              label: "Active clients",
              value: data
                ? String(
                    data.stats.activeClients,
                  )
                : "—",
              change: "Active clients",
              icon: Users,
              iconClass:
                "bg-emerald-100 text-emerald-700",
              accent: "bg-emerald-500",
            },
            {
              label: "Hours worked",
              value: data
                ? `${data.stats.hoursWorked}h`
                : "—",
              change: "Tracked time",
              icon: Clock3,
              iconClass:
                "bg-violet-100 text-violet-700",
              accent: "bg-violet-500",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1 ${stat.accent}`}
                />

                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}
                  >
                    {typeof Icon === "string" ? (
                      <span className="text-xl font-bold">
                        {Icon}
                      </span>
                    ) : (
                      <Icon size={19} />
                    )}
                  </div>

                  <ArrowUpRight
                    size={17}
                    className="text-slate-300 transition group-hover:text-slate-500"
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="text-2xl font-bold tracking-tight text-slate-950">
                    {stat.value}
                  </p>

                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MAIN */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* REVENUE */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 p-5 sm:p-6">
              <div className="absolute right-[-30px] top-[-50px] h-32 w-32 rounded-full bg-blue-100/60 blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">
                      Revenue overview
                    </h2>

                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      Live data
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Monthly completed payments
                    for {selectedYear}
                  </p>
                </div>

                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(
                      Number(event.target.value),
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm outline-none transition focus:border-blue-300"
                >
                  {[
                    currentYear,
                    currentYear - 1,
                    currentYear - 2,
                  ].map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400">
                  Loading revenue data...
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400">
                  No revenue data available.
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
                  <div className="flex h-64 items-end gap-2 border-b border-l border-slate-200 px-3 pb-0 pt-6 sm:gap-4">
                    {chartData.map(
                      (revenue, index) => {
                        const height =
                          Math.max(
                            (revenue /
                              maxRevenue) *
                              100,
                            revenue > 0
                              ? 5
                              : 0,
                          );

                        const barClasses = [
                          "from-blue-400 to-blue-600",
                          "from-indigo-400 to-indigo-600",
                          "from-violet-400 to-violet-600",
                          "from-sky-400 to-sky-600",
                        ];

                        const barColor =
                          barClasses[
                            index %
                              barClasses.length
                          ];

                        return (
                          <div
                            key={`${selectedYear}-${index}`}
                            className="group flex h-full flex-1 items-end"
                          >
                            <div
                              style={{
                                height: `${height}%`,
                              }}
                              title={`${months[index]}: ${formatCurrency(revenue)}`}
                              className={`w-full rounded-t-md bg-gradient-to-t ${barColor} shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-12 px-1 text-center text-[10px] font-medium text-slate-400">
                    {months.map(
                      (month) => (
                        <span key={month}>
                          {month}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Completed revenue
                </div>

                <div className="text-xs font-medium text-slate-400">
                  {data
                    ? formatCurrency(
                        chartData.reduce(
                          (sum, value) =>
                            sum + value,
                          0,
                        ),
                      )
                    : "—"}{" "}
                  yearly
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
                Shortcuts
              </p>

              <h2 className="mt-1 font-semibold text-slate-900">
                Quick actions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Manage your business faster.
              </p>
            </div>

            <div className="mt-5 grid gap-2.5">
              {quickActions.map(
                (action) => {
                  const ActionIcon =
                    action.icon;

                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`group flex items-center gap-3 rounded-xl border border-transparent ${action.bg} p-2.5 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={action.image}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                        />

                        <span
                          className={`absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-md border border-white ${action.iconBg} text-white shadow-sm`}
                        >
                          <ActionIcon size={11} />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {action.label}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {action.description}
                        </p>
                      </div>

                      <ArrowUpRight
                        size={15}
                        className="ml-auto shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700"
                      />
                    </Link>
                  );
                },
              )}
            </div>
          </section>
        </div>

        {/* BOTTOM */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* PROJECTS */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/30 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Active projects
                  </h2>

                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    {projects.length} active
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Keep track of your current work.
                </p>
              </div>

              <Link
                href="/projects"
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-800"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Loading projects...
              </div>
            ) : displayedProjects.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No active projects yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedProjects.map(
                  (
                    project: DashboardProject,
                    index,
                  ) => {
                    const visual =
                      getProjectVisual(
                        index,
                      );

                    return (
                      <Link
                        href={`/projects/${project.id}`}
                        key={project.id}
                        className="group block p-5 transition hover:bg-slate-50/70 sm:p-6"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                              <img
                                src={
                                  visual.image
                                }
                                alt=""
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                              />

                              <span
                                className={`absolute bottom-0 left-0 h-1 w-full ${visual.accent}`}
                              />
                            </div>

                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                {project.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {project.client}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-600">
                              {formatCurrency(
                                project.budget,
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getProjectStatusClasses(
                                project.status,
                              )}`}
                            >
                              {getProjectStatusLabel(
                                project.status,
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-[11px]">
                            <span className="text-slate-400">
                              Progress
                            </span>

                            <span className="font-semibold text-slate-600">
                              {project.progress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${visual.accent} transition-all`}
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    project.progress,
                                    0,
                                  ),
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* INVOICES */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-amber-50/30 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Recent invoices
                  </h2>

                  <CheckCircle2
                    size={15}
                    className="text-emerald-500"
                  />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Latest billing activity.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <Receipt
                  size={17}
                  className="text-amber-600"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Loading invoices...
              </div>
            ) : displayedInvoices.length ===
              0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No invoices yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedInvoices.map(
                  (
                    invoice: DashboardInvoice,
                  ) => {
                    const statusClasses =
                      getInvoiceStatusClasses(
                        invoice.status,
                      );

                    return (
                      <Link
                        href={`/invoices/${invoice.id}`}
                        key={invoice.id}
                        className="group flex items-center justify-between gap-3 p-5 transition hover:bg-slate-50/70"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusClasses.wrapper}`}
                          >
                            <Receipt
                              size={15}
                              className={
                                statusClasses.icon
                              }
                            />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {invoice.number}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {invoice.client}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatCurrency(
                              invoice.amount,
                            )}
                          </p>

                          <p
                            className={`mt-1 text-[10px] font-semibold ${statusClasses.text}`}
                          >
                            {invoice.status}
                          </p>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}

            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
              <Link
                href="/invoices"
                className="flex items-center justify-between text-xs font-semibold text-blue-600 transition hover:text-blue-800"
              >
                View all invoices
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}