"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileText,
  IndianRupee,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";

import {
  createProposal,
  deleteProposal,
  getProposals,
  updateProposal,
  type ApiProposal,
  type ProposalStatus,
} from "@/lib/api/proposals";

import {
  getClients,
  type ApiClient,
} from "@/lib/api/clients";

import {
  getProjects,
  type ApiProject,
} from "@/lib/api/projects";

const statusOptions: ProposalStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Rejected",
  "Expired",
];

const emptyForm = {
  title: "",
  clientId: "",
  projectId: "",
  amount: "",
  validUntil: "",
  description: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CL"
  );
}

function getAvatarGradient(name: string) {
  const gradients = [
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-pink-500",
    "from-indigo-500 to-purple-500",
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

function getStatusStyle(
  status: ProposalStatus,
) {
  switch (status) {
    case "Accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Sent":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Viewed":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "Rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";

    case "Expired":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getNextProposalNumber(
  proposals: ApiProposal[],
) {
  let highest = 0;

  for (const proposal of proposals) {
    const match =
      proposal.number.match(/(\d+)$/);

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1]),
      );
    }
  }

  return `PROP-${new Date().getFullYear()}-${String(
    highest + 1,
  ).padStart(3, "0")}`;
}

export default function ProposalsPage() {
  const { showToast } = useToast();

  const { hasPermission } =
    useAuth();

  /*
   * Frontend permissions.
   *
   * The backend independently enforces
   * these same permissions.
   */
  const canCreate = hasPermission(
    "proposals.create",
  );

  const canUpdate = hasPermission(
    "proposals.update",
  );

  const canDelete = hasPermission(
    "proposals.delete",
  );

  const [proposals, setProposals] =
    useState<ApiProposal[]>([]);

  const [clients, setClients] =
    useState<ApiClient[]>([]);

  const [projects, setProjects] =
    useState<ApiProject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "All" | ProposalStatus
    >("All");

  const [addOpen, setAddOpen] =
    useState(false);

  const [menuId, setMenuId] =
    useState<number | null>(null);

  const [deleteId, setDeleteId] =
    useState<number | null>(null);

  const [newProposal, setNewProposal] =
    useState(emptyForm);

  /*
   * Load proposals, clients and projects
   * from the backend.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const [
          proposalResponse,
          clientResponse,
          projectResponse,
        ] = await Promise.all([
          getProposals(),
          getClients(),
          getProjects(),
        ]);

        if (cancelled) {
          return;
        }

        setProposals(
          proposalResponse.data ?? [],
        );

        setClients(
          clientResponse.data ?? [],
        );

        setProjects(
          projectResponse.data ?? [],
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load proposals.";

        showToast(
          message,
          "error",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  /*
   * Search + status filtering.
   */
  const filteredProposals =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return proposals.filter(
        (proposal) => {
          const matchesSearch =
            !query ||
            proposal.number
              .toLowerCase()
              .includes(query) ||
            proposal.title
              .toLowerCase()
              .includes(query) ||
            proposal.client
              .toLowerCase()
              .includes(query) ||
            proposal.clientEmail
              .toLowerCase()
              .includes(query) ||
            proposal.project
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "All" ||
            proposal.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      proposals,
      search,
      statusFilter,
    ]);

  /*
   * Statistics.
   */
  const totalValue =
    proposals.reduce(
      (sum, proposal) =>
        sum + proposal.amount,
      0,
    );

  const acceptedValue =
    proposals
      .filter(
        (proposal) =>
          proposal.status ===
          "Accepted",
      )
      .reduce(
        (sum, proposal) =>
          sum + proposal.amount,
        0,
      );

  const pendingValue =
    proposals
      .filter(
        (proposal) =>
          proposal.status ===
            "Draft" ||
          proposal.status ===
            "Sent" ||
          proposal.status ===
            "Viewed",
      )
      .reduce(
        (sum, proposal) =>
          sum + proposal.amount,
        0,
      );

  const acceptedCount =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "Accepted",
    ).length;

  const rejectedCount =
    proposals.filter(
      (proposal) =>
        proposal.status ===
        "Rejected",
    ).length;

  const responseCount =
    acceptedCount +
    rejectedCount;

  const acceptanceRate =
    responseCount > 0
      ? Math.round(
          (acceptedCount /
            responseCount) *
            100,
        )
      : 0;

  const selectedClient =
    clients.find(
      (client) =>
        String(client.id) ===
        newProposal.clientId,
    );

  const selectedProject =
    projects.find(
      (project) =>
        String(project.id) ===
        newProposal.projectId,
    );

  /*
   * CREATE PROPOSAL
   */
  const handleAddProposal =
    async () => {
      if (!canCreate) {
        showToast(
          "You do not have permission to create proposals.",
          "error",
        );
        return;
      }

      if (
        !newProposal.title.trim() ||
        !newProposal.clientId ||
        !newProposal.projectId ||
        !newProposal.amount ||
        !newProposal.validUntil
      ) {
        showToast(
          "Please complete all required proposal fields.",
          "error",
        );
        return;
      }

      const amount =
        Number(
          newProposal.amount,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        showToast(
          "Please enter a valid proposal amount.",
          "error",
        );
        return;
      }

      if (!selectedClient) {
        showToast(
          "Please select a valid client.",
          "error",
        );
        return;
      }

      if (!selectedProject) {
        showToast(
          "Please select a valid project.",
          "error",
        );
        return;
      }

      const validUntil =
        new Date(
          `${newProposal.validUntil}T23:59:59`,
        );

      if (
        Number.isNaN(
          validUntil.getTime(),
        )
      ) {
        showToast(
          "Please enter a valid proposal expiry date.",
          "error",
        );
        return;
      }

      if (
        validUntil.getTime() <
        Date.now()
      ) {
        showToast(
          "Valid until date cannot be in the past.",
          "error",
        );
        return;
      }

      setSaving(true);

      try {
        const response =
          await createProposal({
            number:
              getNextProposalNumber(
                proposals,
              ),

            title:
              newProposal.title.trim(),

            client:
              selectedClient.name,

            clientEmail:
              selectedClient.email,

            project:
              selectedProject.name,

            amount,

            status: "Draft",

            issueDate:
              new Date().toISOString(),

            validUntil:
              validUntil.toISOString(),

            description:
              newProposal.description.trim(),

            clientId:
              selectedClient.id,
          });

        if (!response.data) {
          throw new Error(
            response.message ||
              "Proposal was not returned by the API.",
          );
        }

        setProposals(
          (current) => [
            response.data as ApiProposal,
            ...current,
          ],
        );

        setNewProposal(
          emptyForm,
        );

        setAddOpen(false);

        showToast(
          "Proposal created successfully.",
          "success",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create proposal.";

        showToast(
          message,
          "error",
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * STATUS UPDATE
   */
  const handleStatusChange =
    async (
      proposal: ApiProposal,
      status: ProposalStatus,
    ) => {
      if (!canUpdate) {
        showToast(
          "You do not have permission to update proposals.",
          "error",
        );
        return;
      }

      if (
        proposal.status ===
        status
      ) {
        return;
      }

      try {
        const response =
          await updateProposal(
            proposal.id,
            {
              status,
            },
          );

        if (!response.data) {
          throw new Error(
            response.message ||
              "Proposal update failed.",
          );
        }

        setProposals(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                proposal.id
                  ? (response.data as ApiProposal)
                  : item,
            ),
        );

        showToast(
          `${proposal.number} updated to ${status}.`,
          "success",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update proposal.";

        showToast(
          message,
          "error",
        );
      }
    };

  /*
   * DUPLICATE
   *
   * This is a CREATE operation,
   * therefore it requires proposals.create.
   */
  const handleDuplicate =
    async (
      proposal: ApiProposal,
    ) => {
      if (!canCreate) {
        showToast(
          "You do not have permission to create proposals.",
          "error",
        );
        return;
      }

      setSaving(true);

      try {
        const response =
          await createProposal({
            number:
              getNextProposalNumber(
                proposals,
              ),

            title: `${proposal.title} - Copy`,

            client:
              proposal.client,

            clientEmail:
              proposal.clientEmail,

            project:
              proposal.project,

            amount:
              proposal.amount,

            status: "Draft",

            issueDate:
              new Date().toISOString(),

            validUntil:
              proposal.validUntil,

            description:
              proposal.description,

            clientId:
              proposal.clientId,
          });

        if (!response.data) {
          throw new Error(
            response.message ||
              "Failed to duplicate proposal.",
          );
        }

        setProposals(
          (current) => [
            response.data as ApiProposal,
            ...current,
          ],
        );

        setMenuId(null);

        showToast(
          "Proposal duplicated as a draft.",
          "success",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to duplicate proposal.";

        showToast(
          message,
          "error",
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * DELETE
   */
  const handleDelete =
    async () => {
      if (!canDelete) {
        showToast(
          "You do not have permission to delete proposals.",
          "error",
        );
        return;
      }

      if (
        deleteId === null
      ) {
        return;
      }

      const id = deleteId;

      setSaving(true);

      try {
        await deleteProposal(
          id,
        );

        setProposals(
          (current) =>
            current.filter(
              (proposal) =>
                proposal.id !== id,
            ),
        );

        setDeleteId(null);
        setMenuId(null);

        showToast(
          "Proposal deleted successfully.",
          "success",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete proposal.";

        showToast(
          message,
          "error",
        );
      } finally {
        setSaving(false);
      }
    };

  const resetForm = () => {
    setNewProposal(
      emptyForm,
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/40">

        {/* HEADER */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <FileText className="h-3.5 w-3.5" />
                  Sales pipeline
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Proposals
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create, track, and manage client proposals.
                </p>

              </div>

              {canCreate && (
                <button
                  type="button"
                  onClick={() =>
                    setAddOpen(true)
                  }
                  disabled={
                    loading ||
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  New Proposal
                </button>
              )}

            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">

          {/* STATS */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">

              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/70 blur-2xl" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total proposal value
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      totalValue,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {proposals.length} proposal
                    {proposals.length !==
                    1
                      ? "s"
                      : ""}
                  </p>

                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <IndianRupee className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">

              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-100/70 blur-2xl" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Accepted value
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      acceptedValue,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    {acceptedCount} accepted
                  </p>

                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">

              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-100/70 blur-2xl" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Awaiting response
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      pendingValue,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Drafts, sent & viewed
                  </p>

                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <Clock3 className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">

              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-100/70 blur-2xl" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Acceptance rate
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {acceptanceRate}%
                  </p>

                  <p className="mt-1 text-xs text-orange-600">
                    {responseCount} responded
                  </p>

                </div>

                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                  <TrendingUp className="h-5 w-5" />
                </div>

              </div>
            </div>

          </div>

          {/* SEARCH + FILTER */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

              <div className="relative flex-1">

                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search proposals, clients or projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-50"
                />

              </div>

              <div className="flex gap-2 overflow-x-auto">

                {(
                  [
                    "All",
                    ...statusOptions,
                  ] as const
                ).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          item as
                            | "All"
                            | ProposalStatus,
                        )
                      }
                      className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                        statusFilter ===
                        item
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

              </div>

            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-base font-bold text-slate-900">
                  All Proposals
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {loading
                    ? "Loading proposals..."
                    : `${filteredProposals.length} proposal${
                        filteredProposals.length !==
                        1
                          ? "s"
                          : ""
                      } displayed`}
                </p>

              </div>

              <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">

                <IndianRupee className="h-3.5 w-3.5" />

                {formatCurrency(
                  filteredProposals.reduce(
                    (
                      sum,
                      proposal,
                    ) =>
                      sum +
                      proposal.amount,
                    0,
                  ),
                )}

                <span className="font-normal text-violet-500">
                  visible value
                </span>

              </div>

            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">

                <div className="text-center">

                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-violet-500" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Loading proposals...
                  </p>

                </div>

              </div>
            ) : filteredProposals.length ===
              0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <FileText className="h-7 w-7 text-violet-400" />
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No proposals found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {search ||
                  statusFilter !==
                    "All"
                    ? "Try changing your search or status filter."
                    : "Create your first proposal to start tracking opportunities."}
                </p>

                {!search &&
                  statusFilter ===
                    "All" &&
                  canCreate && (
                    <button
                      type="button"
                      onClick={() =>
                        setAddOpen(
                          true,
                        )
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Create Proposal
                    </button>
                  )}

              </div>
            ) : (
              <>
                {/* DESKTOP */}
                <div className="hidden overflow-x-auto lg:block">

                  <table className="w-full">

                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Proposal
                        </th>

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Client
                        </th>

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Project
                        </th>

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Amount
                        </th>

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Dates
                        </th>

                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Status
                        </th>

                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {filteredProposals.map(
                        (proposal) => (
                          <tr
                            key={
                              proposal.id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                          >

                            {/* PROPOSAL */}
                            <td className="px-5 py-4">

                              <Link
                                href={`/proposals/${proposal.id}`}
                                className="group flex items-center gap-3"
                              >

                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                    proposal.client,
                                  )} text-xs font-bold text-white`}
                                >
                                  {getInitials(
                                    proposal.client,
                                  )}
                                </div>

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-bold text-slate-900 group-hover:text-violet-600">
                                    {
                                      proposal.title
                                    }
                                  </p>

                                  <p className="mt-1 text-[11px] font-semibold text-violet-500">
                                    {
                                      proposal.number
                                    }
                                  </p>

                                </div>

                              </Link>

                            </td>

                            {/* CLIENT */}
                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2">

                                <Users className="h-3.5 w-3.5 text-slate-400" />

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {
                                      proposal.client
                                    }
                                  </p>

                                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                    <Mail className="h-3 w-3" />
                                    {
                                      proposal.clientEmail
                                    }
                                  </p>

                                </div>

                              </div>

                            </td>

                            {/* PROJECT */}
                            <td className="px-5 py-4">

                              <p className="max-w-[190px] truncate text-sm font-medium text-slate-700">
                                {
                                  proposal.project
                                }
                              </p>

                            </td>

                            {/* AMOUNT */}
                            <td className="px-5 py-4">

                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(
                                  proposal.amount,
                                )}
                              </p>

                            </td>

                            {/* DATES */}
                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2 text-xs text-slate-500">

                                <CalendarDays className="h-3.5 w-3.5 text-violet-500" />

                                <div>

                                  <p>
                                    {formatDate(
                                      proposal.issueDate,
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-slate-400">
                                    Until{" "}
                                    {formatDate(
                                      proposal.validUntil,
                                    )}
                                  </p>

                                </div>

                              </div>

                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">

                              {canUpdate ? (
                                <select
                                  value={
                                    proposal.status
                                  }
                                  disabled={
                                    saving
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleStatusChange(
                                      proposal,
                                      event
                                        .target
                                        .value as ProposalStatus,
                                    )
                                  }
                                  className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${getStatusStyle(
                                    proposal.status,
                                  )}`}
                                >

                                  {statusOptions.map(
                                    (
                                      status,
                                    ) => (
                                      <option
                                        key={
                                          status
                                        }
                                        value={
                                          status
                                        }
                                      >
                                        {
                                          status
                                        }
                                      </option>
                                    ),
                                  )}

                                </select>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                    proposal.status,
                                  )}`}
                                >
                                  {
                                    proposal.status
                                  }
                                </span>
                              )}

                            </td>

                            {/* ACTIONS */}
                            <td className="px-5 py-4">

                              <div className="flex items-center justify-end gap-1">

                                <Link
                                  href={`/proposals/${proposal.id}`}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"
                                  title="View proposal"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>

                                {(canCreate ||
                                  canDelete) && (
                                  <div className="relative">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMenuId(
                                          menuId ===
                                            proposal.id
                                            ? null
                                            : proposal.id,
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                      title="More actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    {menuId ===
                                      proposal.id && (
                                      <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">

                                        {canCreate && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDuplicate(
                                                proposal,
                                              )
                                            }
                                            disabled={
                                              saving
                                            }
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-violet-50 disabled:opacity-50"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                            Duplicate
                                          </button>
                                        )}

                                        {canDelete && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeleteId(
                                                proposal.id,
                                              );
                                              setMenuId(
                                                null,
                                              );
                                            }}
                                            disabled={
                                              saving
                                            }
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                          </button>
                                        )}

                                      </div>
                                    )}

                                  </div>
                                )}

                              </div>

                            </td>

                          </tr>
                        ),
                      )}

                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}
                <div className="divide-y divide-slate-100 lg:hidden">

                  {filteredProposals.map(
                    (proposal) => (
                      <div
                        key={
                          proposal.id
                        }
                        className="p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >

                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                proposal.client,
                              )} text-xs font-bold text-white`}
                            >
                              {getInitials(
                                proposal.client,
                              )}
                            </div>

                            <div className="min-w-0">

                              <p className="text-[11px] font-bold text-violet-600">
                                {
                                  proposal.number
                                }
                              </p>

                              <h3 className="truncate text-sm font-bold text-slate-900">
                                {
                                  proposal.title
                                }
                              </h3>

                              <p className="truncate text-xs text-slate-500">
                                {
                                  proposal.client
                                }
                              </p>

                            </div>

                          </Link>

                          {(canCreate ||
                            canDelete) && (
                            <button
                              type="button"
                              onClick={() =>
                                setMenuId(
                                  menuId ===
                                    proposal.id
                                    ? null
                                    : proposal.id,
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-xl bg-violet-50 p-3">

                            <p className="text-[10px] font-semibold uppercase text-violet-400">
                              Amount
                            </p>

                            <p className="mt-1 text-sm font-bold text-violet-900">
                              {formatCurrency(
                                proposal.amount,
                              )}
                            </p>

                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Project
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                              {
                                proposal.project
                              }
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">

                          {canUpdate ? (
                            <select
                              value={
                                proposal.status
                              }
                              disabled={
                                saving
                              }
                              onChange={(
                                event,
                              ) =>
                                handleStatusChange(
                                  proposal,
                                  event
                                    .target
                                    .value as ProposalStatus,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${getStatusStyle(
                                proposal.status,
                              )}`}
                            >
                              {statusOptions.map(
                                (
                                  status,
                                ) => (
                                  <option
                                    key={
                                      status
                                    }
                                    value={
                                      status
                                    }
                                  >
                                    {
                                      status
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                proposal.status,
                              )}`}
                            >
                              {
                                proposal.status
                              }
                            </span>
                          )}

                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-600"
                          >
                            View
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>

                        </div>

                        {menuId ===
                          proposal.id && (
                          <div className="mt-3 flex gap-2">

                            {canCreate && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDuplicate(
                                    proposal,
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700 disabled:opacity-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteId(
                                    proposal.id,
                                  );
                                  setMenuId(
                                    null,
                                  );
                                }}
                                disabled={
                                  saving
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}

                          </div>
                        )}

                      </div>
                    ),
                  )}

                </div>
              </>
            )}

          </div>
        </main>

        {/* CREATE PROPOSAL MODAL */}
        {addOpen &&
          canCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">

                  <div>

                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                      <FileText className="h-3.5 w-3.5" />
                      New proposal
                    </div>

                    <h2 className="text-xl font-bold text-slate-900">
                      Create Proposal
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Connect the proposal to an existing client and project.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAddOpen(
                        false,
                      );
                      resetForm();
                    }}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>

                </div>

                <div className="space-y-5 p-6">

                  {/* TITLE */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Proposal Title *
                    </label>

                    <input
                      value={
                        newProposal.title
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewProposal(
                          (current) => ({
                            ...current,
                            title:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="e.g. Website Redesign Proposal"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    />

                  </div>

                  {/* CLIENT */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Client *
                    </label>

                    <select
                      value={
                        newProposal.clientId
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewProposal(
                          (current) => ({
                            ...current,
                            clientId:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    >

                      <option value="">
                        Select a client
                      </option>

                      {clients.map(
                        (client) => (
                          <option
                            key={
                              client.id
                            }
                            value={
                              client.id
                            }
                          >
                            {
                              client.name
                            }
                            {client.company
                              ? ` — ${client.company}`
                              : ""}
                          </option>
                        ),
                      )}

                    </select>

                    {selectedClient && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2">

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-200 text-[10px] font-bold text-violet-700">
                          {getInitials(
                            selectedClient.name,
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-bold text-violet-900">
                            {
                              selectedClient.name
                            }
                          </p>

                          <p className="truncate text-[11px] text-violet-600">
                            {
                              selectedClient.email
                            }
                          </p>

                        </div>

                      </div>
                    )}

                    {clients.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        No clients are available. Add a client first.
                      </p>
                    )}

                  </div>

                  {/* PROJECT */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Project *
                    </label>

                    <select
                      value={
                        newProposal.projectId
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewProposal(
                          (current) => ({
                            ...current,
                            projectId:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    >

                      <option value="">
                        Select a project
                      </option>

                      {projects.map(
                        (project) => (
                          <option
                            key={
                              project.id
                            }
                            value={
                              project.id
                            }
                          >
                            {
                              project.name
                            }
                            {project.client
                              ? ` — ${project.client}`
                              : ""}
                          </option>
                        ),
                      )}

                    </select>

                    {selectedProject && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2">

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-xs font-bold text-sky-900">
                            {
                              selectedProject.name
                            }
                          </p>

                          <p className="text-[11px] text-sky-600">
                            {
                              selectedProject.client
                            }
                          </p>

                        </div>

                      </div>
                    )}

                    {projects.length ===
                      0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        No projects are available. Add a project first.
                      </p>
                    )}

                  </div>

                  {/* AMOUNT */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Proposal Amount *
                    </label>

                    <div className="relative mt-1.5">

                      <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          newProposal.amount
                        }
                        onChange={(
                          event,
                        ) =>
                          setNewProposal(
                            (current) => ({
                              ...current,
                              amount:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      />

                    </div>

                  </div>

                  {/* VALID UNTIL */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Valid Until *
                    </label>

                    <div className="relative mt-1.5">

                      <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="date"
                        value={
                          newProposal.validUntil
                        }
                        min={
                          new Date()
                            .toISOString()
                            .slice(
                              0,
                              10,
                            )
                        }
                        onChange={(
                          event,
                        ) =>
                          setNewProposal(
                            (current) => ({
                              ...current,
                              validUntil:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      />

                    </div>

                  </div>

                  {/* DESCRIPTION */}
                  <div>

                    <label className="text-xs font-bold text-slate-600">
                      Description
                    </label>

                    <textarea
                      value={
                        newProposal.description
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewProposal(
                          (current) => ({
                            ...current,
                            description:
                              event.target
                                .value,
                          }),
                        )
                      }
                      rows={5}
                      placeholder="Describe the project, scope, deliverables, timeline, or other proposal details..."
                      className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    />

                  </div>

                  {/* RELATIONSHIP SUMMARY */}
                  {(selectedClient ||
                    selectedProject) && (
                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-sky-50 p-4">

                      <p className="text-xs font-bold uppercase tracking-wider text-violet-500">
                        Proposal relationship
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">

                        <div className="rounded-xl bg-white/80 p-3">

                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            Client
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-800">
                            {selectedClient?.name ||
                              "Not selected"}
                          </p>

                        </div>

                        <div className="rounded-xl bg-white/80 p-3">

                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            Project
                          </p>

                          <p className="mt-1 truncate text-sm font-bold text-slate-800">
                            {selectedProject?.name ||
                              "Not selected"}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                </div>

                {/* MODAL FOOTER */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() => {
                      setAddOpen(
                        false,
                      );
                      resetForm();
                    }}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleAddProposal
                    }
                    disabled={
                      saving
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}

                    {saving
                      ? "Creating..."
                      : "Create Proposal"}

                  </button>

                </div>

              </div>
            </div>
          )}

        {/* DELETE CONFIRMATION */}
        {deleteId !== null &&
          canDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Delete proposal?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This will permanently remove the proposal from your workspace. This action cannot be undone.
                </p>

                <div className="mt-6 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteId(
                        null,
                      )
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDelete
                    }
                    disabled={
                      saving
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >

                    {saving && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    Delete Proposal

                  </button>

                </div>

              </div>
            </div>
          )}

      </div>
    </AppShell>
  );
}