"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FileSignature,
  CheckCircle2,
  PenLine,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  CalendarDays,
  BriefcaseBusiness,
  IndianRupee,
  X,
  Send,
  FileText,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Users,
  Mail,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";

import {
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  type ApiContract,
  type ContractStatus,
} from "@/lib/api/contracts";

import {
  getClients,
  type ApiClient,
} from "@/lib/api/clients";

const statusOptions: ContractStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Signed",
  "Expired",
  "Cancelled",
];

const emptyContract = {
  title: "",
  clientId: "",
  project: "",
  value: "",
  startDate: "",
  endDate: "",
  description: "",
};

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
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
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    gradients.length;

  return gradients[index];
}

function getStatusStyle(status: ContractStatus) {
  switch (status) {
    case "Signed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Sent":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Viewed":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Expired":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getStatusIcon(status: ContractStatus) {
  switch (status) {
    case "Signed":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "Sent":
      return <Send className="h-3.5 w-3.5" />;
    case "Viewed":
      return <Eye className="h-3.5 w-3.5" />;
    case "Expired":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "Cancelled":
      return <X className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function getNextContractNumber(contracts: ApiContract[]) {
  let highest = 0;

  for (const contract of contracts) {
    const match = contract.number.match(/(\d+)$/);

    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }

  return `CON-${new Date().getFullYear()}-${String(
    highest + 1
  ).padStart(3, "0")}`;
}

export default function ContractsPage() {
  const { showToast } = useToast();

  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [clients, setClients] = useState<ApiClient[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | ContractStatus
  >("All");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [newContract, setNewContract] = useState(emptyContract);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const [contractResponse, clientResponse] =
          await Promise.all([
            getContracts(),
            getClients(),
          ]);

        if (cancelled) return;

        setContracts(contractResponse.data ?? []);
        setClients(clientResponse.data ?? []);
      } catch (error) {
        if (cancelled) return;

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load contracts.",
          "error"
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

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matchesSearch =
        !query ||
        contract.number.toLowerCase().includes(query) ||
        contract.title.toLowerCase().includes(query) ||
        contract.client.toLowerCase().includes(query) ||
        contract.clientEmail.toLowerCase().includes(query) ||
        contract.project.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const activeContracts = contracts.filter(
    (contract) =>
      contract.status === "Signed" ||
      contract.status === "Sent" ||
      contract.status === "Viewed"
  ).length;

  const awaitingSignature = contracts.filter(
    (contract) =>
      contract.status === "Sent" ||
      contract.status === "Viewed"
  ).length;

  const signedContracts = contracts.filter(
    (contract) => contract.status === "Signed"
  );

  const signedValue = signedContracts.reduce(
    (sum, contract) => sum + contract.value,
    0
  );

  const totalValue = contracts.reduce(
    (sum, contract) => sum + contract.value,
    0
  );

  const selectedClient = clients.find(
    (client) =>
      String(client.id) === newContract.clientId
  );

  const handleAddContract = async () => {
    if (
      !newContract.title.trim() ||
      !newContract.clientId ||
      !newContract.project.trim() ||
      !newContract.value ||
      !newContract.startDate ||
      !newContract.endDate
    ) {
      showToast(
        "Please fill in all required fields.",
        "error"
      );
      return;
    }

    const value = Number(newContract.value);

    if (!Number.isFinite(value) || value < 0) {
      showToast(
        "Please enter a valid contract value.",
        "error"
      );
      return;
    }

    if (!selectedClient) {
      showToast(
        "Please select a valid client.",
        "error"
      );
      return;
    }

    const startDate = new Date(
      `${newContract.startDate}T00:00:00`
    );

    const endDate = new Date(
      `${newContract.endDate}T23:59:59`
    );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      showToast(
        "Please enter valid contract dates.",
        "error"
      );
      return;
    }

    if (endDate < startDate) {
      showToast(
        "End date cannot be before start date.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const response = await createContract({
        number: getNextContractNumber(contracts),
        title: newContract.title.trim(),

        // Keep display fields synchronized with the
        // actual Client record.
        client: selectedClient.name,
        clientEmail: selectedClient.email,

        project: newContract.project.trim(),
        value,
        status: "Draft",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: newContract.description.trim(),

        // Real database relationship.
        clientId: selectedClient.id,
      });

      if (!response.data) {
        throw new Error(
          response.message ||
            "Contract was not returned by the API."
        );
      }

      setContracts((current) => [
        response.data as ApiContract,
        ...current,
      ]);

      setNewContract(emptyContract);
      setAddOpen(false);

      showToast(
        "Contract created successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create contract.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    contract: ApiContract,
    status: ContractStatus
  ) => {
    if (contract.status === status) return;

    try {
      const response = await updateContract(
        contract.id,
        { status }
      );

      if (!response.data) {
        throw new Error(
          response.message ||
            "Contract update failed."
        );
      }

      setContracts((current) =>
        current.map((item) =>
          item.id === contract.id
            ? (response.data as ApiContract)
            : item
        )
      );

      showToast(
        `${contract.number} updated to ${status}.`,
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update contract.",
        "error"
      );
    }
  };

  const handleDuplicate = async (
    contract: ApiContract
  ) => {
    setSaving(true);

    try {
      const response = await createContract({
        number: getNextContractNumber(contracts),
        title: `${contract.title} - Copy`,
        client: contract.client,
        clientEmail: contract.clientEmail,
        project: contract.project,
        value: contract.value,
        status: "Draft",
        startDate: contract.startDate,
        endDate: contract.endDate,
        description: contract.description,
        clientId: contract.clientId,
      });

      if (!response.data) {
        throw new Error(
          response.message ||
            "Failed to duplicate contract."
        );
      }

      setContracts((current) => [
        response.data as ApiContract,
        ...current,
      ]);

      setMenuId(null);

      showToast(
        "Contract duplicated as draft.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate contract.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    setSaving(true);

    try {
      await deleteContract(deleteId);

      setContracts((current) =>
        current.filter(
          (contract) => contract.id !== deleteId
        )
      );

      setDeleteId(null);
      setMenuId(null);

      showToast(
        "Contract deleted successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete contract.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Contract Management
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Contracts
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage agreements, signatures and contract lifecycle.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAddOpen(true)}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                New Contract
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Contracts
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {contracts.length}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatCurrency(totalValue)} total value
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                  <FileSignature className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Active Contracts
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {activeContracts}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Sent, viewed & signed
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Awaiting Signature
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-900">
                    {awaitingSignature}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Requires client action
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <PenLine className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Signed Value
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-900">
                    {formatCurrency(signedValue)}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    {signedContracts.length} signed contracts
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Search / Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search contracts, clients or projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "All"
                      | ContractStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="All">
                  All Statuses
                </option>

                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workspace */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 px-5 py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Contract Workspace
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Track every agreement from draft to signed.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {loading
                    ? "Loading..."
                    : `${filteredContracts.length} contracts`}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-500" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Loading contracts...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden lg:block">
                  {filteredContracts.map(
                    (contract) => (
                      <div
                        key={contract.id}
                        className="group border-b border-slate-100 p-5 transition hover:bg-blue-50/20"
                      >
                        <div className="flex items-center gap-5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100 text-slate-700 shadow-sm">
                            <FileSignature className="h-6 w-6" />
                          </div>

                          <div className="min-w-[240px] flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">
                                {contract.number}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                                  contract.status
                                )}`}
                              >
                                {getStatusIcon(
                                  contract.status
                                )}
                                {contract.status}
                              </span>
                            </div>

                            <h3 className="mt-1 truncate text-sm font-bold text-slate-900">
                              {contract.title}
                            </h3>
                          </div>

                          <div className="min-w-[190px]">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                                  contract.client
                                )} text-[10px] font-bold text-white`}
                              >
                                {getInitials(
                                  contract.client
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-800">
                                  {contract.client}
                                </p>

                                <p className="truncate text-[11px] text-slate-400">
                                  {contract.clientEmail}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="hidden min-w-[160px] xl:block">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                <BriefcaseBusiness className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Project
                                </p>

                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {contract.project}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-[115px]">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Value
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {formatCurrency(
                                contract.value
                              )}
                            </p>
                          </div>

                          <div className="hidden min-w-[170px] xl:block">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <CalendarDays className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Contract Period
                                </p>

                                <p className="text-xs font-semibold text-slate-700">
                                  {formatDate(
                                    contract.startDate
                                  )}
                                </p>

                                <p className="text-[10px] text-slate-400">
                                  →{" "}
                                  {formatDate(
                                    contract.endDate
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="rounded-xl p-2.5 text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"
                              title="View Contract"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuId(
                                    menuId ===
                                      contract.id
                                      ? null
                                      : contract.id
                                  )
                                }
                                className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {menuId ===
                                contract.id && (
                                <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDuplicate(
                                        contract
                                      )
                                    }
                                    disabled={saving}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Duplicate
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteId(
                                        contract.id
                                      );
                                      setMenuId(null);
                                    }}
                                    disabled={saving}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ml-[74px] mt-4 flex items-center gap-2">
                          {[
                            "Draft",
                            "Sent",
                            "Viewed",
                            "Signed",
                          ].map(
                            (stage, index) => {
                              const isComplete =
                                [
                                  "Draft",
                                  "Sent",
                                  "Viewed",
                                  "Signed",
                                ].indexOf(
                                  contract.status
                                ) >= index;

                              return (
                                <div
                                  key={stage}
                                  className="flex items-center gap-2"
                                >
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                    <span
                                      className={`h-2 w-2 rounded-full ${
                                        isComplete
                                          ? index ===
                                            3
                                            ? "bg-emerald-500"
                                            : index ===
                                              2
                                            ? "bg-violet-500"
                                            : index ===
                                              1
                                            ? "bg-blue-500"
                                            : "bg-slate-500"
                                          : "bg-slate-200"
                                      }`}
                                    />
                                    {stage}
                                  </div>

                                  {index <
                                    3 && (
                                    <div className="h-px w-8 bg-slate-200" />
                                  )}
                                </div>
                              );
                            }
                          )}

                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400">
                              Update
                            </span>

                            <select
                              value={
                                contract.status
                              }
                              onChange={(e) =>
                                handleStatusChange(
                                  contract,
                                  e.target
                                    .value as ContractStatus
                                )
                              }
                              disabled={saving}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 outline-none focus:border-slate-400 disabled:opacity-50"
                            >
                              {statusOptions.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {filteredContracts.length ===
                    0 && (
                    <div className="p-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FileSignature className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No contracts found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another search or create a new contract.
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile */}
                <div className="divide-y divide-slate-100 lg:hidden">
                  {filteredContracts.map(
                    (contract) => (
                      <div
                        key={contract.id}
                        className="p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-blue-100 text-slate-700">
                            <FileSignature className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-400">
                                {contract.number}
                              </span>

                              <div className="flex items-center">
                                <Link
                                  href={`/contracts/${contract.id}`}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuId(
                                      menuId ===
                                        contract.id
                                        ? null
                                        : contract.id
                                    )
                                  }
                                  className="rounded-lg p-1.5 text-slate-400"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <h3 className="mt-1 text-sm font-bold text-slate-900">
                              {contract.title}
                            </h3>

                            <div className="mt-2 flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                                  contract.client
                                )} text-[9px] font-bold text-white`}
                              >
                                {getInitials(
                                  contract.client
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {contract.client}
                                </p>

                                <p className="truncate text-[10px] text-slate-400">
                                  {contract.clientEmail}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Value
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {formatCurrency(
                                contract.value
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-blue-50 p-3">
                            <p className="text-[10px] font-semibold uppercase text-blue-400">
                              Project
                            </p>

                            <p className="mt-1 truncate text-sm font-bold text-blue-900">
                              {contract.project}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <select
                            value={contract.status}
                            onChange={(e) =>
                              handleStatusChange(
                                contract,
                                e.target
                                  .value as ContractStatus
                              )
                            }
                            disabled={saving}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${getStatusStyle(
                              contract.status
                            )}`}
                          >
                            {statusOptions.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status}
                                </option>
                              )
                            )}
                          </select>

                          <Link
                            href={`/contracts/${contract.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            View
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>

                        {menuId ===
                          contract.id && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleDuplicate(
                                  contract
                                )
                              }
                              disabled={saving}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700 disabled:opacity-50"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteId(
                                  contract.id
                                );
                                setMenuId(null);
                              }}
                              disabled={saving}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2.5">
                  <PenLine className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Keep your agreements organized
                  </p>

                  <p className="mt-1 text-xs text-slate-300">
                    Track every contract from draft to signed in one place.
                  </p>
                </div>
              </div>

              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-200"
              >
                View Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>

        {/* Create Contract Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                      <ShieldCheck className="h-4 w-4" />
                      Contract Management
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      New Contract
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                      Create a professional agreement for your client.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAddOpen(false);
                      setNewContract(
                        emptyContract
                      );
                    }}
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Contract Title *
                  </label>

                  <input
                    value={newContract.title}
                    onChange={(e) =>
                      setNewContract(
                        (current) => ({
                          ...current,
                          title: e.target.value,
                        })
                      )
                    }
                    placeholder="Website Development Agreement"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* REAL CLIENT SELECTOR */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Client *
                  </label>

                  <select
                    value={newContract.clientId}
                    onChange={(e) =>
                      setNewContract(
                        (current) => ({
                          ...current,
                          clientId:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">
                      Select a client
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name}
                        {client.company
                          ? ` — ${client.company}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  {selectedClient && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-blue-50 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {getInitials(
                          selectedClient.name
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-900">
                          {selectedClient.name}
                        </p>

                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600">
                          <Mail className="h-3 w-3" />
                          {selectedClient.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {clients.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No clients available. Create a client first.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project *
                    </label>

                    <input
                      value={newContract.project}
                      onChange={(e) =>
                        setNewContract(
                          (current) => ({
                            ...current,
                            project:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Website Redesign"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Contract Value *
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={newContract.value}
                        onChange={(e) =>
                          setNewContract(
                            (current) => ({
                              ...current,
                              value:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="85000"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Start Date *
                    </label>

                    <input
                      type="date"
                      value={newContract.startDate}
                      onChange={(e) =>
                        setNewContract(
                          (current) => ({
                            ...current,
                            startDate:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      End Date *
                    </label>

                    <input
                      type="date"
                      value={newContract.endDate}
                      min={newContract.startDate}
                      onChange={(e) =>
                        setNewContract(
                          (current) => ({
                            ...current,
                            endDate:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    rows={5}
                    value={newContract.description}
                    onChange={(e) =>
                      setNewContract(
                        (current) => ({
                          ...current,
                          description:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="Describe the agreement, scope and terms..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                      <Users className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Client relationship
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        This contract will be linked to the selected client using its real database ID.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    setNewContract(
                      emptyContract
                    );
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAddContract}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {saving
                    ? "Creating..."
                    : "Create Contract"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Delete this contract?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This contract will be permanently removed from your workspace.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteId(null)
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Delete Contract
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}