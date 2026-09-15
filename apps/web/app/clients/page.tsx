"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Ellipsis,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ClientModal, {
  Client as ClientModalData,
} from "@/components/clients/ClientModal";

import {
  createClient,
  deleteClient as deleteClientApi,
  getClients,
  updateClient as updateClientApi,
  type ApiClient,
} from "@/lib/api/clients";

import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";

type ClientStatus = "Active" | "Inactive";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ClientStatus;
  projects: number;
  totalRevenue: number;
  createdAt: string;
}

const gradients = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-pink-500",
  "from-indigo-500 to-purple-500",
  "from-rose-500 to-orange-500",
];

function getGradient(name: string) {
  const index =
    name
      .split("")
      .reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0,
      ) % gradients.length;

  return gradients[index];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string) {
  if (!date) {
    return "—";
  }

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

function normalizeApiClient(
  client: ApiClient,
): Client {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone ?? "",
    company: client.company,
    status: client.status,
    projects: client.projects,
    totalRevenue: client.totalRevenue,
    createdAt: client.createdAt,
  };
}

export default function ClientsPage() {
  const { showToast } = useToast();

  const { hasPermission } = useAuth();

  const canCreate =
    hasPermission("clients.create");

  const canUpdate =
    hasPermission("clients.update");

  const canDelete =
    hasPermission("clients.delete");

  const canExport =
    hasPermission("clients.export");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"All" | ClientStatus>("All");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [editingClient, setEditingClient] =
    useState<Client | null>(null);

  const [deletingClient, setDeletingClient] =
    useState<Client | null>(null);

  const [openMenu, setOpenMenu] =
    useState<number | null>(null);

  const [apiClients, setApiClients] =
    useState<ApiClient[]>([]);

  const [apiLoading, setApiLoading] =
    useState(true);

  const [apiConnected, setApiConnected] =
    useState(false);

  const [apiError, setApiError] =
    useState("");

  /*
   * LOAD CLIENTS
   */
  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      setApiLoading(true);
      setApiError("");

      try {
        const response = await getClients();

        if (cancelled) {
          return;
        }

        if (
          response.success &&
          Array.isArray(response.data)
        ) {
          setApiClients(response.data);
          setApiConnected(true);
          return;
        }

        setApiConnected(false);

        setApiError(
          response.message ||
            "Could not load clients.",
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load clients:",
          error,
        );

        setApiConnected(false);

        setApiError(
          error instanceof Error
            ? error.message
            : "Could not connect to the clients API.",
        );
      } finally {
        if (!cancelled) {
          setApiLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * API IS THE SOURCE OF TRUTH
   */
  const displayClients = useMemo<Client[]>(
    () =>
      apiClients.map(normalizeApiClient),
    [apiClients],
  );

  /*
   * FILTER CLIENTS
   */
  const filteredClients = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return displayClients.filter(
      (client) => {
        const matchesSearch =
          !query ||
          client.name
            .toLowerCase()
            .includes(query) ||
          client.email
            .toLowerCase()
            .includes(query) ||
          client.company
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          client.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      },
    );
  }, [
    displayClients,
    search,
    statusFilter,
  ]);

  /*
   * STATS
   */
  const totalRevenue =
    displayClients.reduce(
      (sum, client) =>
        sum + client.totalRevenue,
      0,
    );

  const activeClients =
    displayClients.filter(
      (client) =>
        client.status === "Active",
    ).length;

  const inactiveClients =
    displayClients.filter(
      (client) =>
        client.status === "Inactive",
    ).length;

  const totalProjects =
    displayClients.reduce(
      (sum, client) =>
        sum + client.projects,
      0,
    );

  /*
   * ADD CLIENT
   */
  const handleAddClient = async (
    data: ClientModalData,
  ) => {
    setShowAddModal(false);

    try {
      const response =
        await createClient({
          name: data.name,
          email: data.email,
          phone:
            data.phone || undefined,
          company: "Independent",
          status: "Active",
          projects: 0,
          totalRevenue: 0,
        });

      if (
        response.success &&
        response.data
      ) {
        setApiClients((current) => [
          response.data!,
          ...current.filter(
            (item) =>
              item.id !==
              response.data!.id,
          ),
        ]);

        setApiConnected(true);
        setApiError("");

        showToast(
          `${response.data.name} was added successfully.`,
        );

        return;
      }

      setShowAddModal(true);

      showToast(
        response.message ||
          "Could not add client. Please try again.",
      );
    } catch (error) {
      console.error(
        "Could not create client:",
        error,
      );

      setShowAddModal(true);

      showToast(
        error instanceof Error
          ? error.message
          : "Could not add client. Please try again.",
      );
    }
  };

  /*
   * EDIT CLIENT
   */
  const handleEditClient = async (
    client: Client,
  ) => {
    setEditingClient(null);
    setOpenMenu(null);

    try {
      const response =
        await updateClientApi(
          client.id,
          {
            name: client.name,
            email: client.email,
            phone:
              client.phone ||
              undefined,
            company:
              client.company ||
              "Independent",
            status: client.status,
            projects:
              client.projects,
            totalRevenue:
              client.totalRevenue,
          },
        );

      if (
        response.success &&
        response.data
      ) {
        setApiClients((current) =>
          current.map((item) =>
            item.id ===
            response.data!.id
              ? response.data!
              : item,
          ),
        );

        setApiConnected(true);
        setApiError("");

        showToast(
          `${response.data.name} was updated successfully.`,
        );

        return;
      }

      showToast(
        response.message ||
          "Could not update client. Please try again.",
      );
    } catch (error) {
      console.error(
        "Could not update client:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not update client. Please try again.",
      );
    }
  };

  /*
   * DELETE CLIENT
   */
  const handleDeleteClient = async () => {
    if (!deletingClient) {
      return;
    }

    const client =
      deletingClient;

    try {
      const response =
        await deleteClientApi(
          client.id,
        );

      if (response.success) {
        setApiClients((current) =>
          current.filter(
            (item) =>
              item.id !== client.id,
          ),
        );

        setDeletingClient(null);
        setOpenMenu(null);

        showToast(
          `${client.name} was removed successfully.`,
        );

        return;
      }

      showToast(
        response.message ||
          "Could not delete client. Please try again.",
      );
    } catch (error) {
      console.error(
        "Could not delete client:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not delete client. Please try again.",
      );
    }
  };

  /*
   * STATUS CHANGE
   */
  const handleStatusChange = async (
    client: Client,
    status: ClientStatus,
  ) => {
    try {
      const response =
        await updateClientApi(
          client.id,
          {
            status,
          },
        );

      if (
        response.success &&
        response.data
      ) {
        setApiClients((current) =>
          current.map((item) =>
            item.id ===
            response.data!.id
              ? response.data!
              : item,
          ),
        );

        setApiConnected(true);
        setApiError("");

        showToast(
          `${response.data.name} is now ${status}.`,
        );

        return;
      }

      showToast(
        response.message ||
          "Could not update client status.",
      );
    } catch (error) {
      console.error(
        "Could not update client status:",
        error,
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Could not update client status.",
      );
    }
  };

  /*
   * EXPORT CSV
   */
  const exportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Status",
      "Projects",
      "Total Revenue",
      "Created At",
    ];

    const rows =
      filteredClients.map(
        (client) => [
          client.name,
          client.email,
          client.phone,
          client.company,
          client.status,
          client.projects,
          client.totalRevenue,
          client.createdAt,
        ],
      );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value ?? "",
              ).replace(
                /"/g,
                '""',
              )}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "freelanceos-clients.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast(
      `${filteredClients.length} clients exported.`,
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50">

        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-600 px-5 py-8 sm:px-8 lg:px-10">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-100">
                  <Users className="h-4 w-4" />
                  CRM

                  <span className="text-purple-300">
                    /
                  </span>

                  Clients
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Client Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-purple-100 sm:text-base">
                  Manage relationships,
                  projects and revenue
                  from one beautiful
                  workspace.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">

                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur">

                    <span
                      className={`h-2 w-2 rounded-full ${
                        apiLoading
                          ? "bg-yellow-300"
                          : apiConnected
                            ? "bg-emerald-300"
                            : "bg-red-300"
                      }`}
                    />

                    {apiLoading
                      ? "Connecting..."
                      : apiConnected
                        ? "API connected"
                        : "API unavailable"}

                  </div>

                  {apiLoading && (
                    <span className="text-xs text-purple-100">
                      Loading clients...
                    </span>
                  )}

                </div>
              </div>

              {canCreate && (
                <button
                  onClick={() =>
                    setShowAddModal(true)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-purple-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Client
                </button>
              )}

            </div>
          </div>
        </section>

        {/* API ERROR */}
        {!apiLoading &&
          apiError && (
            <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-8 lg:px-10">
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Could not load clients
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    {apiError}
                  </p>
                </div>

                <button
                  onClick={() =>
                    window.location.reload()
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>

              </div>
            </div>
          )}

        {/* STATS */}
        <section className="mx-auto mt-6 max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              label="Total Clients"
              value={
                apiLoading
                  ? "—"
                  : displayClients.length.toString()
              }
              icon={
                <Users className="h-5 w-5" />
              }
              iconClass="bg-violet-100 text-violet-600"
            />

            <StatCard
              label="Active Clients"
              value={
                apiLoading
                  ? "—"
                  : activeClients.toString()
              }
              icon={
                <Check className="h-5 w-5" />
              }
              iconClass="bg-emerald-100 text-emerald-600"
            />

            <StatCard
              label="Projects"
              value={
                apiLoading
                  ? "—"
                  : totalProjects.toString()
              }
              icon={
                <Building2 className="h-5 w-5" />
              }
              iconClass="bg-blue-100 text-blue-600"
            />

            <StatCard
              label="Client Revenue"
              value={
                apiLoading
                  ? "—"
                  : formatCurrency(
                      totalRevenue,
                    )
              }
              icon={
                <span className="text-lg font-bold">
                  ₹
                </span>
              }
              iconClass="bg-fuchsia-100 text-fuchsia-600"
              footer={
                apiLoading
                  ? undefined
                  : `${inactiveClients} inactive clients`
              }
            />

          </div>
        </section>

        {/* MAIN */}
        <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">

          {/* TOOLBAR */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div className="relative min-w-0 flex-1">

                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search clients, companies or email..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <div className="relative">

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target
                          .value as
                          | "All"
                          | ClientStatus,
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:w-36"
                  >
                    <option value="All">
                      All Status
                    </option>

                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                </div>

                {canExport && (
                  <button
                    onClick={exportCSV}
                    disabled={apiLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                )}

              </div>

            </div>
          </div>

          {/* RESULT COUNT */}
          <div className="mb-4 flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold text-slate-900">
                All Clients
              </p>

              <p className="text-xs text-slate-500">
                {apiLoading
                  ? "Loading clients..."
                  : `Showing ${filteredClients.length} of ${displayClients.length} clients`}
              </p>

            </div>

          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {apiLoading ? (
              <div className="divide-y divide-slate-100">

                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="animate-pulse px-5 py-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-xl bg-slate-200" />

                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-40 rounded bg-slate-200" />
                          <div className="h-3 w-56 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ),
                )}

              </div>
            ) : (
              <>
                <div className="hidden border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_1.4fr_1fr_1fr_1.1fr_40px] lg:items-center lg:gap-4">

                  <span>Client</span>
                  <span>Company</span>
                  <span>Projects</span>
                  <span>Revenue</span>
                  <span>Status</span>
                  <span />

                </div>

                {filteredClients.length ===
                0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">

                    <div className="rounded-2xl bg-violet-100 p-4 text-violet-600">
                      <Users className="h-7 w-7" />
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      No clients found
                    </h3>

                    <p className="mt-1 max-w-sm text-sm text-slate-500">
                      {search ||
                      statusFilter !==
                        "All"
                        ? "Try changing your search or filters."
                        : "Add your first client to get started."}
                    </p>

                    {canCreate && (
                      <button
                        onClick={() =>
                          setShowAddModal(true)
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Client
                      </button>
                    )}

                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">

                    {filteredClients.map(
                      (client) => (
                        <div
                          key={client.id}
                          className="group relative px-4 py-4 transition hover:bg-slate-50/70 sm:px-5"
                        >

                          {/* DESKTOP */}
                          <div className="hidden lg:grid lg:grid-cols-[2fr_1.4fr_1fr_1fr_1.1fr_40px] lg:items-center lg:gap-4">

                            <div className="flex min-w-0 items-center gap-3">

                              <Avatar
                                client={
                                  client
                                }
                              />

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {client.name}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {client.email}
                                </p>

                                {client.phone && (
                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    {client.phone}
                                  </p>
                                )}

                              </div>
                            </div>

                            <div className="flex min-w-0 items-center gap-2">

                              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />

                              <span className="truncate text-sm font-medium text-slate-700">
                                {client.company ||
                                  "Independent"}
                              </span>

                            </div>

                            <div>

                              <p className="text-sm font-semibold text-slate-900">
                                {client.projects}
                              </p>

                              <p className="text-xs text-slate-400">
                                active projects
                              </p>

                            </div>

                            <div>

                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(
                                  client.totalRevenue,
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                lifetime value
                              </p>

                            </div>

                            <div>
                              {canUpdate ? (
                                <StatusSelect
                                  client={
                                    client
                                  }
                                  onChange={
                                    handleStatusChange
                                  }
                                />
                              ) : (
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    client.status ===
                                    "Active"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {
                                    client.status
                                  }
                                </span>
                              )}
                            </div>

                            <ClientMenu
                              client={
                                client
                              }
                              canUpdate={
                                canUpdate
                              }
                              canDelete={
                                canDelete
                              }
                              open={
                                openMenu ===
                                client.id
                              }
                              onToggle={() =>
                                setOpenMenu(
                                  openMenu ===
                                    client.id
                                    ? null
                                    : client.id,
                                )
                              }
                              onEdit={() => {
                                setEditingClient(
                                  client,
                                );
                                setOpenMenu(
                                  null,
                                );
                              }}
                              onDelete={() => {
                                setDeletingClient(
                                  client,
                                );
                                setOpenMenu(
                                  null,
                                );
                              }}
                            />

                          </div>

                          {/* MOBILE */}
                          <div className="lg:hidden">

                            <div className="flex items-start justify-between gap-3">

                              <div className="flex min-w-0 items-center gap-3">

                                <Avatar
                                  client={
                                    client
                                  }
                                  size="large"
                                />

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {client.name}
                                  </p>

                                  <p className="truncate text-xs text-slate-500">
                                    {client.company ||
                                      "Independent"}
                                  </p>

                                </div>
                              </div>

                              <ClientMenu
                                client={
                                  client
                                }
                                canUpdate={
                                  canUpdate
                                }
                                canDelete={
                                  canDelete
                                }
                                open={
                                  openMenu ===
                                  client.id
                                }
                                onToggle={() =>
                                  setOpenMenu(
                                    openMenu ===
                                      client.id
                                      ? null
                                      : client.id,
                                  )
                                }
                                onEdit={() => {
                                  setEditingClient(
                                    client,
                                  );
                                  setOpenMenu(
                                    null,
                                  );
                                }}
                                onDelete={() => {
                                  setDeletingClient(
                                    client,
                                  );
                                  setOpenMenu(
                                    null,
                                  );
                                }}
                              />

                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                              <InfoBox
                                label="Email"
                                icon={
                                  <Mail className="h-3.5 w-3.5" />
                                }
                                value={
                                  client.email
                                }
                              />

                              <InfoBox
                                label="Phone"
                                icon={
                                  <Phone className="h-3.5 w-3.5" />
                                }
                                value={
                                  client.phone ||
                                  "—"
                                }
                              />

                              <InfoBox
                                label="Projects"
                                value={client.projects.toString()}
                              />

                              <InfoBox
                                label="Revenue"
                                value={formatCurrency(
                                  client.totalRevenue,
                                )}
                              />

                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Added{" "}
                                {formatDate(
                                  client.createdAt,
                                )}
                              </div>

                              {canUpdate ? (
                                <StatusSelect
                                  client={
                                    client
                                  }
                                  onChange={
                                    handleStatusChange
                                  }
                                />
                              ) : (
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    client.status ===
                                    "Active"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {
                                    client.status
                                  }
                                </span>
                              )}

                            </div>

                          </div>

                        </div>
                      ),
                    )}

                  </div>
                )}
              </>
            )}

          </div>

          {/* CTA */}
          <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-violet-950 to-fuchsia-950 p-6 text-white shadow-lg sm:p-7">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-lg font-bold">
                  Keep your client
                  relationships organized
                </p>

                <p className="mt-1 max-w-xl text-sm text-slate-300">
                  Turn qualified leads
                  into clients and keep
                  every project, proposal
                  and payment connected.
                </p>

              </div>

              <Link
                href="/leads"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                View Leads
              </Link>

            </div>
          </div>

        </main>

        {/* ADD MODAL */}
        {showAddModal && (
          <ClientModal
            onClose={() =>
              setShowAddModal(false)
            }
            onAdd={handleAddClient}
          />
        )}

        {/* EDIT MODAL */}
        {editingClient && (
          <EditClientModal
            client={editingClient}
            onClose={() =>
              setEditingClient(null)
            }
            onSave={handleEditClient}
          />
        )}

        {/* DELETE MODAL */}
        {deletingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

              <div className="flex items-start justify-between">

                <div>

                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <Trash2 className="h-5 w-5" />
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Delete client?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Are you sure you
                    want to delete{" "}
                    <span className="font-semibold text-slate-700">
                      {deletingClient.name}
                    </span>
                    ? This action
                    cannot be undone.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setDeletingClient(
                      null,
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  onClick={() =>
                    setDeletingClient(
                      null,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleDeleteClient
                  }
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete Client
                </button>

              </div>

            </div>
          </div>
        )}

        {/* CLOSE MENU */}
        {openMenu !== null && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() =>
              setOpenMenu(null)
            }
          />
        )}

      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT CARD                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon,
  iconClass,
  footer,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  footer?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold text-slate-900">
            {value}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

      </div>

      {footer && (
        <p className="mt-2 text-xs text-slate-400">
          {footer}
        </p>
      )}

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AVATAR                                                                     */
/* -------------------------------------------------------------------------- */

function Avatar({
  client,
  size = "normal",
}: {
  client: Client;
  size?: "normal" | "large";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getGradient(
        client.name,
      )} font-bold text-white shadow-sm ${
        size === "large"
          ? "h-12 w-12 text-sm"
          : "h-11 w-11 text-sm"
      }`}
    >
      {client.name
        .split(" ")
        .map(
          (part) => part[0],
        )
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STATUS SELECT                                                              */
/* -------------------------------------------------------------------------- */

function StatusSelect({
  client,
  onChange,
}: {
  client: Client;
  onChange: (
    client: Client,
    status: ClientStatus,
  ) => void;
}) {
  return (
    <select
      value={client.status}
      onChange={(event) =>
        onChange(
          client,
          event.target
            .value as ClientStatus,
        )
      }
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none ${
        client.status === "Active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      <option value="Active">
        Active
      </option>

      <option value="Inactive">
        Inactive
      </option>
    </select>
  );
}

/* -------------------------------------------------------------------------- */
/* CLIENT MENU                                                                */
/* -------------------------------------------------------------------------- */

function ClientMenu({
  client,
  open,
  onToggle,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: {
  client: Client;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const hasActions =
    canUpdate || canDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="relative flex shrink-0 justify-end">

      <button
        onClick={onToggle}
        aria-label={`Actions for ${client.name}`}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Ellipsis className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">

          {canUpdate && (
            <button
              onClick={onEdit}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit Client
            </button>
          )}

          <Link
            href={`/projects?client=${client.id}`}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700"
          >
            <Building2 className="h-4 w-4" />
            View Projects
          </Link>

          {canDelete && (
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Client
            </button>
          )}

        </div>
      )}

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INFO BOX                                                                   */
/* -------------------------------------------------------------------------- */

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">

      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 flex min-w-0 items-center gap-1.5">

        {icon && (
          <span className="shrink-0 text-slate-400">
            {icon}
          </span>
        )}

        <p className="truncate text-xs font-medium text-slate-700">
          {value}
        </p>

      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EDIT CLIENT MODAL                                                          */
/* -------------------------------------------------------------------------- */

function EditClientModal({
  client,
  onClose,
  onSave,
}: {
  client: Client;
  onClose: () => void;
  onSave: (client: Client) => void;
}) {
  const [form, setForm] =
    useState<Client>(client);

  const update = <
    K extends keyof Client
  >(
    key: K,
    value: Client[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Edit Client
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Update client information
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="space-y-4 p-6">

          <InputField
            label="Name"
            value={form.name}
            onChange={(value) =>
              update("name", value)
            }
          />

          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) =>
              update("email", value)
            }
          />

          <InputField
            label="Phone"
            value={form.phone}
            onChange={(value) =>
              update("phone", value)
            }
          />

          <InputField
            label="Company"
            value={form.company}
            onChange={(value) =>
              update("company", value)
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">

            <InputField
              label="Projects"
              type="number"
              value={form.projects.toString()}
              onChange={(value) =>
                update(
                  "projects",
                  Math.max(
                    0,
                    Number(value),
                  ),
                )
              }
            />

            <InputField
              label="Total Revenue"
              type="number"
              value={form.totalRevenue.toString()}
              onChange={(value) =>
                update(
                  "totalRevenue",
                  Math.max(
                    0,
                    Number(value),
                  ),
                )
              }
            />

          </div>

          <div>

            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Status
            </label>

            <select
              value={form.status}
              onChange={(event) =>
                update(
                  "status",
                  event.target
                    .value as ClientStatus,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

          </div>

        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={() =>
              onSave(form)
            }
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-700"
          >
            Save Changes
          </button>

        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INPUT FIELD                                                                */
/* -------------------------------------------------------------------------- */

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>

      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />

    </div>
  );
}