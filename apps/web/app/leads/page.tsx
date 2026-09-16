"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";

import {
  createLead,
  deleteLead as deleteLeadApi,
  getLeads,
  updateLead as updateLeadApi,
  type ApiLead,
  type LeadSource,
  type LeadStatus,
} from "@/lib/api/leads";

import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  X,
  Trash2,
  UserPlus,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const columns: {
  status: LeadStatus;
  title: string;
  description: string;
  color: string;
  light: string;
  border: string;
  dot: string;
}[] = [
  {
    status: "New",
    title: "New",
    description: "Fresh opportunities",
    color: "text-blue-700",
    light: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  {
    status: "Contacted",
    title: "Contacted",
    description: "Initial conversation",
    color: "text-violet-700",
    light: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  {
    status: "Qualified",
    title: "Qualified",
    description: "Ready to convert",
    color: "text-amber-700",
    light: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  {
    status: "Proposal",
    title: "Proposal",
    description: "Proposal sent",
    color: "text-orange-700",
    light: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  {
    status: "Won",
    title: "Won",
    description: "Successfully closed",
    color: "text-emerald-700",
    light: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    status: "Lost",
    title: "Lost",
    description: "Not converted",
    color: "text-rose-700",
    light: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
];

const leadSources: LeadSource[] = [
  "Website",
  "LinkedIn",
  "Referral",
  "Instagram",
  "Facebook",
  "Cold Email",
  "Other",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarGradient(name: string) {
  const gradients = [
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-pink-500",
    "from-indigo-500 to-purple-500",
    "from-pink-500 to-rose-500",
  ];

  const index =
    name
      .split("")
      .reduce(
        (sum, char) =>
          sum + char.charCodeAt(0),
        0,
      ) % gradients.length;

  return gradients[index];
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(date: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LeadsPage() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const canCreate =
    hasPermission("leads.create");

  const canUpdate =
    hasPermission("leads.update");

  const canDelete =
    hasPermission("leads.delete");

  const [leads, setLeads] =
    useState<ApiLead[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [apiConnected, setApiConnected] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [sourceFilter, setSourceFilter] =
    useState("All Sources");

  const [addOpen, setAddOpen] =
    useState(false);

  const [menuLeadId, setMenuLeadId] =
    useState<number | null>(null);

  const [deleteId, setDeleteId] =
    useState<number | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [newLead, setNewLead] =
    useState({
      name: "",
      email: "",
      company: "",
      phone: "",
      source: "Website" as LeadSource,
      value: "",
    });

  /*
   * LOAD LEADS
   */
  useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      setLoading(true);

      try {
        const response =
          await getLeads();

        if (
          !cancelled &&
          response.success &&
          Array.isArray(response.data)
        ) {
          setLeads(response.data);
          setApiConnected(true);
        }
      } catch (error) {
        console.error(
          "Failed to load leads:",
          error,
        );

        if (!cancelled) {
          setApiConnected(false);

          showToast(
            "Could not load leads from the server.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  /*
   * FILTERED LEADS
   */
  const filteredLeads = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        lead.name
          .toLowerCase()
          .includes(query) ||
        lead.email
          .toLowerCase()
          .includes(query) ||
        lead.company
          .toLowerCase()
          .includes(query) ||
        (lead.phone ?? "")
          .toLowerCase()
          .includes(query);

      const matchesSource =
        sourceFilter === "All Sources" ||
        lead.source === sourceFilter;

      return (
        matchesSearch &&
        matchesSource
      );
    });
  }, [
    leads,
    search,
    sourceFilter,
  ]);

  /*
   * STATS
   */
  const totalPipeline =
    leads.reduce(
      (sum, lead) =>
        sum + lead.value,
      0,
    );

  const activeLeads =
    leads.filter(
      (lead) =>
        lead.status !== "Won" &&
        lead.status !== "Lost",
    ).length;

  const wonRevenue =
    leads
      .filter(
        (lead) =>
          lead.status === "Won",
      )
      .reduce(
        (sum, lead) =>
          sum + lead.value,
        0,
      );

  const conversionRate =
    leads.length > 0
      ? Math.round(
          (leads.filter(
            (lead) =>
              lead.status === "Won",
          ).length /
            leads.length) *
            100,
        )
      : 0;

  /*
   * ADD LEAD
   */
  const handleAddLead = async () => {
    if (
      !newLead.name.trim() ||
      !newLead.email.trim() ||
      !newLead.company.trim() ||
      !newLead.value
    ) {
      showToast(
        "Please fill in all required fields.",
        "error",
      );
      return;
    }

    const value =
      Number(newLead.value);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      showToast(
        "Please enter a valid deal value.",
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await createLead({
          name:
            newLead.name.trim(),
          email:
            newLead.email.trim(),
          company:
            newLead.company.trim(),
          phone:
            newLead.phone.trim() ||
            undefined,
          source:
            newLead.source,
          value,
          status: "New",
        });

      if (
        response.success &&
        response.data
      ) {
        setLeads((current) => [
          response.data!,
          ...current,
        ]);

        setNewLead({
          name: "",
          email: "",
          company: "",
          phone: "",
          source: "Website",
          value: "",
        });

        setAddOpen(false);
        setApiConnected(true);

        showToast(
          "Lead added successfully.",
          "success",
        );
      } else {
        showToast(
          response.message ||
            "Could not create lead.",
          "error",
        );
      }
    } catch (error) {
      console.error(
        "Failed to create lead:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not create lead. Please try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * STATUS CHANGE
   */
  const handleStatusChange = async (
    lead: ApiLead,
    status: LeadStatus,
  ) => {
    try {
      const response =
        await updateLeadApi(
          lead.id,
          {
            status,
          },
        );

      if (
        response.success &&
        response.data
      ) {
        setLeads((current) =>
          current.map((item) =>
            item.id === lead.id
              ? response.data!
              : item,
          ),
        );

        showToast(
          `${lead.name} moved to ${status}.`,
          "success",
        );
      } else {
        showToast(
          response.message ||
            "Could not update lead status.",
          "error",
        );
      }
    } catch (error) {
      console.error(
        "Failed to update lead status:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not update lead status. Please try again.",
        "error",
      );
    }
  };

  /*
   * DELETE LEAD
   */
  const handleDelete = async () => {
    if (deleteId === null) {
      return;
    }

    const id = deleteId;

    try {
      const response =
        await deleteLeadApi(id);

      if (response.success) {
        setLeads((current) =>
          current.filter(
            (lead) => lead.id !== id,
          ),
        );

        setDeleteId(null);
        setMenuLeadId(null);

        showToast(
          "Lead deleted successfully.",
          "success",
        );
      } else {
        showToast(
          response.message ||
            "Could not delete lead.",
          "error",
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete lead:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not delete lead. Please try again.",
        "error",
      );
    }
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/40">

        {/* HEADER */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <Target className="h-3.5 w-3.5" />
                  Sales CRM
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Leads
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage prospects and move opportunities through your sales pipeline.
                </p>

                <div className="mt-3 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      apiConnected
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  />

                  <span className="text-xs font-medium text-slate-500">
                    {apiConnected
                      ? "Database connected"
                      : "Database unavailable"}
                  </span>

                  {loading && (
                    <span className="text-xs text-slate-400">
                      Loading...
                    </span>
                  )}

                </div>

              </div>

              {canCreate && (
                <button
                  onClick={() =>
                    setAddOpen(true)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add Lead
                </button>
              )}

            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* STATS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="group overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Total Pipeline
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(
                      totalPipeline,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-blue-100">
                    Across all opportunities
                  </p>
                </div>

                <div className="rounded-xl bg-white/20 p-3">
                  <DollarSign className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-violet-100">
                    Active Leads
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {activeLeads}
                  </p>

                  <p className="mt-1 text-xs text-violet-100">
                    Currently in pipeline
                  </p>
                </div>

                <div className="rounded-xl bg-white/20 p-3">
                  <Users className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-emerald-100">
                    Won Revenue
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(
                      wonRevenue,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-emerald-100">
                    Successfully converted
                  </p>
                </div>

                <div className="rounded-xl bg-white/20 p-3">
                  <TrendingUp className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-500 to-pink-600 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Conversion Rate
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {conversionRate}%
                  </p>

                  <p className="mt-1 text-xs text-orange-100">
                    Leads converted to won
                  </p>
                </div>

                <div className="rounded-xl bg-white/20 p-3">
                  <Target className="h-5 w-5" />
                </div>

              </div>
            </div>

          </div>

          {/* SEARCH / FILTER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value,
                    )
                  }
                  placeholder="Search leads by name, company, email or phone..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />

              </div>

              <select
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(
                    e.target.value,
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option>
                  All Sources
                </option>

                {leadSources.map(
                  (source) => (
                    <option
                      key={source}
                    >
                      {source}
                    </option>
                  ),
                )}
              </select>

            </div>
          </div>

          {/* PIPELINE */}
          <div className="overflow-x-auto pb-4">

            <div className="grid min-w-[1500px] grid-cols-6 gap-4">

              {columns.map(
                (column) => {

                  const columnLeads =
                    filteredLeads.filter(
                      (lead) =>
                        lead.status ===
                        column.status,
                    );

                  const columnValue =
                    columnLeads.reduce(
                      (sum, lead) =>
                        sum + lead.value,
                      0,
                    );

                  return (
                    <div
                      key={
                        column.status
                      }
                      className={`flex min-h-[560px] flex-col rounded-2xl border ${column.border} ${column.light}/50`}
                    >

                      {/* COLUMN HEADER */}
                      <div className="border-b border-white/80 p-4">

                        <div className="flex items-start justify-between gap-2">

                          <div>

                            <div className="flex items-center gap-2">

                              <span
                                className={`h-2.5 w-2.5 rounded-full ${column.dot}`}
                              />

                              <h2
                                className={`text-sm font-bold ${column.color}`}
                              >
                                {column.title}
                              </h2>

                              <span
                                className={`rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow-sm ${column.color}`}
                              >
                                {
                                  columnLeads.length
                                }
                              </span>

                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                column.description
                              }
                            </p>

                          </div>

                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                            aria-label={`${column.title} column options`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                        </div>

                        <div className="mt-3 rounded-xl bg-white/70 px-3 py-2">

                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Pipeline value
                          </p>

                          <p
                            className={`mt-0.5 text-sm font-bold ${column.color}`}
                          >
                            {formatCurrency(
                              columnValue,
                            )}
                          </p>

                        </div>

                      </div>

                      {/* CARDS */}
                      <div className="flex-1 space-y-3 p-3">

                        {columnLeads.map(
                          (lead) => (

                            <div
                              key={
                                lead.id
                              }
                              className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
                            >

                              <div className="flex items-start justify-between">

                                <div className="flex min-w-0 items-center gap-3">

                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                      lead.name,
                                    )} text-xs font-bold text-white shadow-sm`}
                                  >
                                    {getInitials(
                                      lead.name,
                                    )}
                                  </div>

                                  <div className="min-w-0">

                                    <h3 className="truncate text-sm font-bold text-slate-900">
                                      {
                                        lead.name
                                      }
                                    </h3>

                                    <p className="truncate text-xs text-slate-500">
                                      {
                                        lead.company
                                      }
                                    </p>

                                  </div>

                                </div>

                                {canDelete && (
                                  <div className="relative">

                                    <button
                                      onClick={() =>
                                        setMenuLeadId(
                                          menuLeadId ===
                                            lead.id
                                            ? null
                                            : lead.id,
                                        )
                                      }
                                      className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                                      aria-label={`Actions for ${lead.name}`}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    {menuLeadId ===
                                      lead.id && (
                                      <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">

                                        <button
                                          onClick={() => {
                                            setDeleteId(
                                              lead.id,
                                            );
                                            setMenuLeadId(
                                              null,
                                            );
                                          }}
                                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete lead
                                        </button>

                                      </div>
                                    )}

                                  </div>
                                )}

                              </div>

                              <div className="mt-4 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3">

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Deal value
                                </p>

                                <p className="mt-1 text-lg font-bold text-slate-900">
                                  {formatCurrency(
                                    lead.value,
                                  )}
                                </p>

                              </div>

                              <div className="mt-4 space-y-2">

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Mail className="h-3.5 w-3.5 shrink-0 text-violet-500" />

                                  <span className="truncate">
                                    {
                                      lead.email
                                    }
                                  </span>
                                </div>

                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Phone className="h-3.5 w-3.5 shrink-0 text-blue-500" />

                                    <span>
                                      {
                                        lead.phone
                                      }
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Building2 className="h-3.5 w-3.5 shrink-0 text-orange-500" />

                                  <span className="truncate">
                                    {
                                      lead.company
                                    }
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-500" />

                                  <span>
                                    {formatDate(
                                      lead.createdAt,
                                    )}
                                  </span>
                                </div>

                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                                  {
                                    lead.source
                                  }
                                </span>

                                {canUpdate ? (
                                  <div className="relative">

                                    <select
                                      value={
                                        lead.status
                                      }
                                      onChange={(
                                        e,
                                      ) =>
                                        handleStatusChange(
                                          lead,
                                          e.target
                                            .value as LeadStatus,
                                        )
                                      }
                                      className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-[10px] font-semibold text-slate-600 outline-none focus:border-violet-400"
                                    >
                                      {columns.map(
                                        (
                                          item,
                                        ) => (
                                          <option
                                            key={
                                              item.status
                                            }
                                            value={
                                              item.status
                                            }
                                          >
                                            {
                                              item.status
                                            }
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />

                                  </div>
                                ) : (
                                  <span
                                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                                      column.color
                                    } ${column.light}`}
                                  >
                                    {
                                      lead.status
                                    }
                                  </span>
                                )}

                              </div>

                            </div>

                          ),
                        )}

                        {columnLeads.length ===
                          0 && (
                          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 text-center">

                            <div className="rounded-xl bg-white p-3 shadow-sm">
                              <Users className="h-5 w-5 text-slate-300" />
                            </div>

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                              No leads here
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Move a lead into this stage
                            </p>

                          </div>
                        )}

                      </div>

                      {canCreate && (
                        <button
                          onClick={() =>
                            setAddOpen(true)
                          }
                          className={`m-3 mt-0 flex items-center justify-center gap-1.5 rounded-xl border border-dashed ${column.border} bg-white/60 py-2.5 text-xs font-semibold ${column.color} transition hover:bg-white`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Lead
                        </button>
                      )}

                    </div>
                  );
                },
              )}

            </div>
          </div>

          {/* BOTTOM CTA */}
          <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2.5 text-white shadow-lg shadow-violet-200">
                <UserPlus className="h-5 w-5" />
              </div>

              <div>

                <p className="text-sm font-bold text-slate-900">
                  Ready to convert your leads?
                </p>

                <p className="text-xs text-slate-500">
                  Qualified and won leads can become clients in your CRM.
                </p>

              </div>

            </div>

            <a
              href="/clients"
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              View Clients
              <ArrowRight className="h-4 w-4" />
            </a>

          </div>

        </main>

        {/* ADD LEAD MODAL */}
        {addOpen && canCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

              <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 text-white">

                <div className="flex items-center justify-between">

                  <div>

                    <div className="mb-1 flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />

                      <span className="text-sm font-semibold text-violet-100">
                        Sales CRM
                      </span>
                    </div>

                    <h2 className="text-xl font-bold">
                      Add New Lead
                    </h2>

                    <p className="mt-1 text-sm text-violet-100">
                      Add a new prospect to your sales pipeline.
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setAddOpen(false)
                    }
                    className="rounded-xl bg-white/15 p-2 transition hover:bg-white/25"
                  >
                    <X className="h-5 w-5" />
                  </button>

                </div>

              </div>

              <div className="space-y-5 p-6">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Name *
                    </label>

                    <input
                      value={
                        newLead.name
                      }
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          name: e.target
                            .value,
                        })
                      }
                      placeholder="Rahul Sharma"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Company *
                    </label>

                    <input
                      value={
                        newLead.company
                      }
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          company:
                            e.target
                              .value,
                        })
                      }
                      placeholder="Acme Corporation"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Email *
                    </label>

                    <input
                      type="email"
                      value={
                        newLead.email
                      }
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          email:
                            e.target
                              .value,
                        })
                      }
                      placeholder="rahul@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Phone
                    </label>

                    <input
                      value={
                        newLead.phone
                      }
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          phone:
                            e.target
                              .value,
                        })
                      }
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Deal Value *
                    </label>

                    <div className="relative">

                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={
                          newLead.value
                        }
                        onChange={(e) =>
                          setNewLead({
                            ...newLead,
                            value:
                              e.target
                                .value,
                          })
                        }
                        placeholder="120000"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Lead Source
                    </label>

                    <select
                      value={
                        newLead.source
                      }
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          source:
                            e.target
                              .value as LeadSource,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >
                      {leadSources.map(
                        (source) => (
                          <option
                            key={source}
                          >
                            {source}
                          </option>
                        ),
                      )}
                    </select>

                  </div>

                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  <button
                    onClick={() =>
                      setAddOpen(false)
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleAddLead
                    }
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Adding..."
                      : "Add Lead"}
                  </button>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteId !== null &&
          canDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Delete this lead?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This action cannot be undone. The lead will be permanently removed from your pipeline.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    onClick={() =>
                      setDeleteId(null)
                    }
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleDelete
                    }
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-100 hover:bg-rose-700"
                  >
                    Delete Lead
                  </button>

                </div>

              </div>
            </div>
          )}

      </div>
    </AppShell>
  );
}