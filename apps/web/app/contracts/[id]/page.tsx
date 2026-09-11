"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  FileSignature,
  IndianRupee,
  Loader2,
  Mail,
  MoreHorizontal,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  User,
  X,
  BriefcaseBusiness,
  AlertCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";

import {
  getContract,
  updateContract,
  deleteContract,
  createContract,
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

const lifecycleStages: ContractStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Signed",
];

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

function formatDateTime(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateInput(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
        0
      ) % gradients.length;

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
      return <CheckCircle2 className="h-4 w-4" />;
    case "Sent":
      return <Send className="h-4 w-4" />;
    case "Viewed":
      return <Check className="h-4 w-4" />;
    case "Expired":
      return <AlertCircle className="h-4 w-4" />;
    case "Cancelled":
      return <X className="h-4 w-4" />;
    default:
      return <FileSignature className="h-4 w-4" />;
  }
}

function getStageIndex(status: ContractStatus) {
  if (status === "Expired") return 2;
  if (status === "Cancelled") return -1;

  return lifecycleStages.indexOf(status);
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const contractId = Number(params.id);

  const [contract, setContract] =
    useState<ApiContract | null>(null);

  const [clients, setClients] = useState<ApiClient[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editOpen, setEditOpen] =
    useState(false);
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    clientId: "",
    project: "",
    value: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "Draft" as ContractStatus,
  });

  useEffect(() => {
    if (!Number.isInteger(contractId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadContract() {
      setLoading(true);

      try {
        const [contractResponse, clientsResponse] =
          await Promise.all([
            getContract(contractId),
            getClients(),
          ]);

        if (cancelled) return;

        if (!contractResponse.data) {
          throw new Error(
            contractResponse.message ||
              "Contract not found."
          );
        }

        const loadedContract =
          contractResponse.data;

        setContract(loadedContract);
        setClients(
          clientsResponse.data ?? []
        );

        setEditForm({
          title: loadedContract.title,
          clientId:
            loadedContract.clientId !== null
              ? String(
                  loadedContract.clientId
                )
              : "",
          project: loadedContract.project,
          value: String(
            loadedContract.value
          ),
          startDate: formatDateInput(
            loadedContract.startDate
          ),
          endDate: formatDateInput(
            loadedContract.endDate
          ),
          description:
            loadedContract.description ?? "",
          status: loadedContract.status,
        });
      } catch (error) {
        if (cancelled) return;

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load contract.",
          "error"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId, showToast]);

  const currentStageIndex = useMemo(() => {
    if (!contract) return -1;

    return getStageIndex(contract.status);
  }, [contract]);

  const selectedEditClient = clients.find(
    (client) =>
      String(client.id) ===
      editForm.clientId
  );

  const handleStatusChange = async (
    status: ContractStatus
  ) => {
    if (!contract || contract.status === status) {
      return;
    }

    setSaving(true);

    try {
      const response = await updateContract(
        contract.id,
        { status }
      );

      if (!response.data) {
        throw new Error(
          response.message ||
            "Failed to update contract."
        );
      }

      setContract(
        response.data as ApiContract
      );

      setEditForm((current) => ({
        ...current,
        status,
      }));

      showToast(
        `Contract status changed to ${status}.`,
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update contract.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!contract) return;

    if (
      !editForm.title.trim() ||
      !editForm.project.trim() ||
      !editForm.value ||
      !editForm.startDate ||
      !editForm.endDate
    ) {
      showToast(
        "Please complete all required fields.",
        "error"
      );
      return;
    }

    const value = Number(editForm.value);

    if (!Number.isFinite(value) || value < 0) {
      showToast(
        "Please enter a valid contract value.",
        "error"
      );
      return;
    }

    const startDate = new Date(
      `${editForm.startDate}T00:00:00`
    );

    const endDate = new Date(
      `${editForm.endDate}T23:59:59`
    );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      showToast(
        "Please enter valid dates.",
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
      const updateData: {
        title: string;
        project: string;
        value: number;
        startDate: string;
        endDate: string;
        description: string;
        status: ContractStatus;
        clientId?: number | null;
        client?: string;
        clientEmail?: string;
      } = {
        title: editForm.title.trim(),
        project: editForm.project.trim(),
        value,
        startDate:
          startDate.toISOString(),
        endDate:
          endDate.toISOString(),
        description:
          editForm.description.trim(),
        status: editForm.status,
      };

      if (editForm.clientId) {
        const client = selectedEditClient;

        if (!client) {
          throw new Error(
            "Selected client could not be found."
          );
        }

        updateData.clientId = client.id;
        updateData.client = client.name;
        updateData.clientEmail =
          client.email;
      }

      const response = await updateContract(
        contract.id,
        updateData
      );

      if (!response.data) {
        throw new Error(
          response.message ||
            "Failed to save contract."
        );
      }

      setContract(
        response.data as ApiContract
      );

      setEditOpen(false);

      showToast(
        "Contract updated successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update contract.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!contract) return;

    setSaving(true);

    try {
      const response = await createContract({
        number: `CON-${new Date().getFullYear()}-${String(
          Date.now()
        ).slice(-5)}`,
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

      setMenuOpen(false);

      showToast(
        "Contract duplicated as a draft.",
        "success"
      );

      router.push(
        `/contracts/${response.data.id}`
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
    if (!contract) return;

    setDeleting(true);

    try {
      await deleteContract(contract.id);

      showToast(
        "Contract deleted successfully.",
        "success"
      );

      router.push("/contracts");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete contract.",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Loading contract...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!contract) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <FileSignature className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Contract not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This contract may have been deleted or may not belong to your workspace.
            </p>

            <Link
              href="/contracts"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Contracts
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/contracts"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      {contract.number}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
                        contract.status
                      )}`}
                    >
                      {getStatusIcon(
                        contract.status
                      )}
                      {contract.status}
                    </span>
                  </div>

                  <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {contract.title}
                  </h1>

                  <p className="mt-1 text-xs text-slate-500">
                    Contract Workspace
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpen(
                        (current) => !current
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:bg-slate-50"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={
                          handleDuplicate
                        }
                        disabled={saving}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteOpen(true);
                        }}
                        disabled={saving}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Lifecycle */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />

                  <h2 className="text-sm font-bold text-slate-900">
                    Contract Lifecycle
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Move the agreement through its current stage.
                </p>
              </div>

              <select
                value={contract.status}
                onChange={(e) =>
                  handleStatusChange(
                    e.target
                      .value as ContractStatus
                  )
                }
                disabled={saving}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold outline-none disabled:opacity-50 ${getStatusStyle(
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
            </div>

            <div className="mt-7 overflow-x-auto">
              <div className="flex min-w-[680px] items-center">
                {lifecycleStages.map(
                  (stage, index) => {
                    const completed =
                      currentStageIndex >=
                      index;

                    const current =
                      contract.status ===
                      stage;

                    return (
                      <div
                        key={stage}
                        className="flex flex-1 items-center"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                              completed
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-slate-200 bg-white text-slate-400"
                            } ${
                              current
                                ? "ring-4 ring-blue-100"
                                : ""
                            }`}
                          >
                            {completed ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">
                                {index + 1}
                              </span>
                            )}
                          </div>

                          <span
                            className={`mt-2 text-xs font-bold ${
                              completed
                                ? "text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            {stage}
                          </span>
                        </div>

                        {index <
                          lifecycleStages.length -
                            1 && (
                          <div
                            className={`mx-3 mt-[-18px] h-0.5 flex-1 ${
                              currentStageIndex >
                              index
                                ? "bg-blue-500"
                                : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {contract.status ===
              "Expired" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />

                <div>
                  <p className="text-xs font-bold text-orange-800">
                    Contract expired
                  </p>

                  <p className="mt-1 text-xs leading-5 text-orange-700">
                    The contract's end date has passed or the agreement has been marked expired.
                  </p>
                </div>
              </div>
            )}

            {contract.status ===
              "Cancelled" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />

                <div>
                  <p className="text-xs font-bold text-rose-800">
                    Contract cancelled
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-700">
                    This agreement has been marked as cancelled.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Main information */}
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              {/* Contract document */}
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-6 py-7 text-white">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                        <FileSignature className="h-4 w-4" />
                        Agreement
                      </div>

                      <h2 className="mt-2 text-2xl font-bold">
                        {contract.title}
                      </h2>

                      <p className="mt-1 text-sm text-slate-300">
                        {contract.number}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                        Contract Value
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {formatCurrency(
                          contract.value
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-7 p-6">
                  {/* Parties */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />

                      <h3 className="text-sm font-bold text-slate-900">
                        Client
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                          contract.client
                        )} text-sm font-bold text-white`}
                      >
                        {getInitials(
                          contract.client
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {contract.client}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5" />
                          {contract.clientEmail}
                        </p>

                        {contract.clientRecord
                          ?.company && (
                          <p className="mt-1 text-xs text-slate-400">
                            {
                              contract
                                .clientRecord
                                .company
                            }
                          </p>
                        )}
                      </div>

                      {contract.clientId && (
                        <Link
                          href={`/clients/${contract.clientId}`}
                          className="hidden items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-600 shadow-sm hover:bg-blue-50 sm:inline-flex"
                        >
                          View Client
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Project */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <BriefcaseBusiness className="h-4 w-4 text-violet-500" />

                      <h3 className="text-sm font-bold text-slate-900">
                        Project
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 p-5">
                      <p className="text-lg font-bold text-violet-950">
                        {contract.project}
                      </p>

                      <p className="mt-1 text-xs text-violet-600">
                        Associated project
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                      <div className="flex items-center gap-2 text-blue-600">
                        <CalendarDays className="h-4 w-4" />

                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          Start Date
                        </span>
                      </div>

                      <p className="mt-2 text-lg font-bold text-blue-950">
                        {formatDate(
                          contract.startDate
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
                      <div className="flex items-center gap-2 text-violet-600">
                        <Clock3 className="h-4 w-4" />

                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          End Date
                        </span>
                      </div>

                      <p className="mt-2 text-lg font-bold text-violet-950">
                        {formatDate(
                          contract.endDate
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-slate-500" />

                      <h3 className="text-sm font-bold text-slate-900">
                        Agreement Description
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      {contract.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {
                            contract.description
                          }
                        </p>
                      ) : (
                        <p className="text-sm italic text-slate-400">
                          No description has been added to this contract.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Activity */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-500" />

                  <h2 className="text-sm font-bold text-slate-900">
                    Contract Activity
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <FileSignature className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Contract created
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(
                          contract.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <Edit3 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Contract last updated
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(
                          contract.updatedAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getStatusStyle(
                        contract.status
                      )}`}
                    >
                      {getStatusIcon(
                        contract.status
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Current status:{" "}
                        {contract.status}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Update the status above to move the contract through its lifecycle.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-500" />

                  <h2 className="text-sm font-bold text-slate-900">
                    Contract Summary
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Value
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {formatCurrency(
                        contract.value
                      )}
                    </p>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Client
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {contract.client}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Project
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {contract.project}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Period
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatDate(
                        contract.startDate
                      )}
                    </p>

                    <p className="text-xs text-slate-400">
                      to{" "}
                      {formatDate(
                        contract.endDate
                      )}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />

                  <h2 className="text-sm font-bold text-slate-900">
                    Quick Actions
                  </h2>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "Sent"
                      )
                    }
                    disabled={
                      saving ||
                      contract.status ===
                        "Sent"
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Mark as Sent
                    </span>

                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "Viewed"
                      )
                    }
                    disabled={
                      saving ||
                      contract.status ===
                        "Viewed"
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-left text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Mark as Viewed
                    </span>

                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "Signed"
                      )
                    }
                    disabled={
                      saving ||
                      contract.status ===
                        "Signed"
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Signed
                    </span>

                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white p-2.5 text-blue-600 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Contract record
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      This page is connected to the database record for this contract. Changes are saved through the API.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>

        {/* Edit modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 text-white">
                <div>
                  <p className="text-xs font-semibold text-blue-200">
                    {contract.number}
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Edit Contract
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(false)
                  }
                  className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Contract Title *
                  </label>

                  <input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          title:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Client
                  </label>

                  <select
                    value={
                      editForm.clientId
                    }
                    onChange={(e) =>
                      setEditForm(
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
                      No linked client
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project *
                    </label>

                    <input
                      value={
                        editForm.project
                      }
                      onChange={(e) =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            project:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Value *
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={
                          editForm.value
                        }
                        onChange={(e) =>
                          setEditForm(
                            (current) => ({
                              ...current,
                              value:
                                e.target.value,
                            })
                          )
                        }
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
                      value={
                        editForm.startDate
                      }
                      onChange={(e) =>
                        setEditForm(
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
                      min={
                        editForm.startDate
                      }
                      value={
                        editForm.endDate
                      }
                      onChange={(e) =>
                        setEditForm(
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
                    Status
                  </label>

                  <select
                    value={
                      editForm.status
                    }
                    onChange={(e) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          status:
                            e.target
                              .value as ContractStatus,
                        })
                      )
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none ${getStatusStyle(
                      editForm.status
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
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    rows={6}
                    value={
                      editForm.description
                    }
                    onChange={(e) =>
                      setEditForm(
                        (current) => ({
                          ...current,
                          description:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(false)
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveEdit
                  }
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {deleteOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Delete {contract.number}?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This contract will be permanently removed from the database. This action cannot be undone.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteOpen(false)
                  }
                  disabled={deleting}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {deleting
                    ? "Deleting..."
                    : "Delete Contract"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}