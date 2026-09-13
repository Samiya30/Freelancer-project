"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ApiInvoice,
  InvoiceStatus,
  createInvoice,
  deleteInvoice,
  getInvoices,
  updateInvoice,
} from "@/lib/api/invoices";
import { getClients, ApiClient } from "@/lib/api/clients";
import { getProjects, ApiProject } from "@/lib/api/projects";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  CalendarDays,
  UserRound,
  BriefcaseBusiness,
  Send,
  Download,
  X,
  Receipt,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const statusOptions: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Paid",
  "Overdue",
  "Cancelled",
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

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
  ];

  const index =
    name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    gradients.length;

  return gradients[index];
}

function getStatusStyle(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Sent":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Viewed":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Overdue":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Cancelled":
      return "bg-slate-100 text-slate-500 border-slate-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function getStatusIcon(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "Sent":
      return <Send className="h-3.5 w-3.5" />;
    case "Viewed":
      return <Eye className="h-3.5 w-3.5" />;
    case "Overdue":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "Cancelled":
      return <X className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export default function InvoicesPage() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | InvoiceStatus
  >("All");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [newInvoice, setNewInvoice] = useState({
    client: "",
    clientEmail: "",
    clientId: null as number | null,
    project: "",
    projectId: null as number | null,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    description: "",
    tax: "0",
    discount: "0",
    items: [
      {
        id: 1,
        description: "",
        quantity: "1",
        rate: "",
      },
    ],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [invoiceResponse, clientResponse, projectResponse] =
          await Promise.all([
            getInvoices(),
            getClients(),
            getProjects(),
          ]);

        setInvoices(invoiceResponse.data ?? []);
        setClients(clientResponse.data ?? []);
        setProjects(projectResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load invoice data:", error);

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load invoice data.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showToast]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        invoice.number.toLowerCase().includes(query) ||
        invoice.client.toLowerCase().includes(query) ||
        invoice.project.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalAmount = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );

  const paidAmount = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const pendingAmount = invoices
    .filter(
      (invoice) =>
        invoice.status === "Sent" ||
        invoice.status === "Viewed"
    )
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const overdueAmount = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const invoiceSubtotal = newInvoice.items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) *
        (Number(item.rate) || 0),
    0
  );

  const taxAmount =
    invoiceSubtotal * ((Number(newInvoice.tax) || 0) / 100);

  const discountAmount =
    invoiceSubtotal *
    ((Number(newInvoice.discount) || 0) / 100);

  const invoiceTotal = Math.max(
    0,
    invoiceSubtotal + taxAmount - discountAmount
  );

  const resetInvoiceForm = () => {
    setNewInvoice({
      client: "",
      clientEmail: "",
      clientId: null,
      project: "",
      projectId: null,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      description: "",
      tax: "0",
      discount: "0",
      items: [
        {
          id: 1,
          description: "",
          quantity: "1",
          rate: "",
        },
      ],
    });
  };

  const handleClientChange = (clientName: string) => {
    const client = clients.find(
      (item) => item.name === clientName
    );

    setNewInvoice((current) => ({
      ...current,
      client: clientName,
      clientEmail: client?.email ?? "",
      clientId: client?.id ?? null,
    }));
  };

  const handleProjectChange = (projectName: string) => {
    const project = projects.find(
      (item) => item.name === projectName
    );

    setNewInvoice((current) => ({
      ...current,
      project: projectName,
      projectId: project?.id ?? null,
    }));
  };

  const updateItem = (
    id: number,
    field: "description" | "quantity" | "rate",
    value: string
  ) => {
    setNewInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const addItem = () => {
    setNewInvoice((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: Date.now(),
          description: "",
          quantity: "1",
          rate: "",
        },
      ],
    }));
  };

  const removeItem = (id: number) => {
    if (newInvoice.items.length === 1) return;

    setNewInvoice((current) => ({
      ...current,
      items: current.items.filter(
        (item) => item.id !== id
      ),
    }));
  };

  const getNextInvoiceNumber = () => {
    const numbers = invoices
      .map((invoice) => {
        const match = invoice.number.match(
          /^INV-2026-(\d+)$/
        );

        return match ? Number(match[1]) : 0;
      })
      .filter((number) => number > 0);

    const nextNumber =
      numbers.length > 0
        ? Math.max(...numbers) + 1
        : 1;

    return `INV-2026-${String(nextNumber).padStart(3, "0")}`;
  };

  const handleAddInvoice = async () => {
    if (
      !newInvoice.client ||
      !newInvoice.clientEmail ||
      !newInvoice.project ||
      !newInvoice.issueDate ||
      !newInvoice.dueDate
    ) {
      showToast(
        "Please complete the required invoice fields.",
        "error"
      );
      return;
    }

    const validItems = newInvoice.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.rate) >= 0
    );

    if (validItems.length === 0) {
      showToast(
        "Add at least one valid invoice item.",
        "error"
      );
      return;
    }

    if (!newInvoice.clientId) {
      showToast(
        "Please select a valid client.",
        "error"
      );
      return;
    }

    if (!newInvoice.projectId) {
      showToast(
        "Please select a valid project.",
        "error"
      );
      return;
    }

    try {
      setSaving(true);

      const response = await createInvoice({
        number: getNextInvoiceNumber(),
        client: newInvoice.client,
        clientEmail: newInvoice.clientEmail,
        project: newInvoice.project,
        amount: invoiceTotal,
        status: "Draft",
        issueDate: newInvoice.issueDate,
        dueDate: newInvoice.dueDate,
        description: newInvoice.description.trim(),
        tax: Number(newInvoice.tax) || 0,
        discount: Number(newInvoice.discount) || 0,
        clientId: newInvoice.clientId,
        projectId: newInvoice.projectId,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          rate: Number(item.rate),
        })),
      });

      if (response.data) {
        setInvoices((current) => [
          response.data!,
          ...current,
        ]);
      }

      resetInvoiceForm();
      setAddOpen(false);

      showToast(
        "Invoice created successfully.",
        "success"
      );
    } catch (error) {
      console.error("Failed to create invoice:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create invoice.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    invoice: ApiInvoice,
    status: InvoiceStatus
  ) => {
    if (invoice.status === status) return;

    try {
      const response = await updateInvoice(invoice.id, {
        status,
      });

      if (response.data) {
        setInvoices((current) =>
          current.map((item) =>
            item.id === invoice.id
              ? response.data!
              : item
          )
        );
      }

      showToast(
        `${invoice.number} updated to ${status}.`,
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to update invoice:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update invoice.",
        "error"
      );
    }
  };

  const handleMarkPaid = async (
    invoice: ApiInvoice
  ) => {
    try {
      const response = await updateInvoice(
        invoice.id,
        {
          status: "Paid",
        }
      );

      if (response.data) {
        setInvoices((current) =>
          current.map((item) =>
            item.id === invoice.id
              ? response.data!
              : item
          )
        );
      }

      setMenuId(null);

      showToast(
        `${invoice.number} marked as paid.`,
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to mark invoice as paid:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update invoice.",
        "error"
      );
    }
  };

  const handleDuplicate = async (
    invoice: ApiInvoice
  ) => {
    try {
      setSaving(true);

      const response = await createInvoice({
        number: getNextInvoiceNumber(),
        client: invoice.client,
        clientEmail: invoice.clientEmail,
        project: invoice.project,
        amount: invoice.amount,
        status: "Draft",
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        description: invoice.description,
        tax: invoice.tax,
        discount: invoice.discount,
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
        })),
      });

      if (response.data) {
        setInvoices((current) => [
          response.data!,
          ...current,
        ]);
      }

      setMenuId(null);

      showToast(
        "Invoice duplicated as draft.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to duplicate invoice:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate invoice.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      setSaving(true);

      await deleteInvoice(deleteId);

      setInvoices((current) =>
        current.filter(
          (invoice) => invoice.id !== deleteId
        )
      );

      setDeleteId(null);
      setMenuId(null);

      showToast(
        "Invoice deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to delete invoice:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete invoice.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Invoice",
      "Client",
      "Project",
      "Amount",
      "Status",
      "Issue Date",
      "Due Date",
    ];

    const rows = filteredInvoices.map((invoice) => [
      invoice.number,
      invoice.client,
      invoice.project,
      invoice.amount,
      invoice.status,
      formatDate(invoice.issueDate),
      formatDate(invoice.dueDate),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "freelanceos-invoices.csv";
    link.click();

    URL.revokeObjectURL(url);

    showToast(
      "Invoice CSV exported.",
      "success"
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Receipt className="h-3.5 w-3.5" />
                  Finance
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Invoices
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create, send and manage your client invoices.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>

                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  New Invoice
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {loading && (
            <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                <span className="text-sm font-medium text-slate-500">
                  Loading invoices...
                </span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Total Invoiced
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {formatCurrency(totalAmount)}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    {invoices.length} invoices
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Paid
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {formatCurrency(paidAmount)}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Successfully collected
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
                    Pending
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {formatCurrency(pendingAmount)}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Sent or viewed
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-700">
                    Overdue
                  </p>

                  <p className="mt-2 text-3xl font-bold text-rose-950">
                    {formatCurrency(overdueAmount)}
                  </p>

                  <p className="mt-1 text-xs text-rose-600">
                    Requires follow-up
                  </p>
                </div>

                <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search invoices, clients or projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "All"
                      | InvoiceStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="All">
                  All Statuses
                </option>

                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Workspace */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-fuchsia-50/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Invoice Workspace
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Track billing, due dates and payment status.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {filteredInvoices.length} invoices
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="group border-b border-slate-100 p-5 transition hover:bg-violet-50/20"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-sm">
                      <Receipt className="h-6 w-6" />
                    </div>

                    <div className="min-w-[220px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          {invoice.number}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                            invoice.status
                          )}`}
                        >
                          {getStatusIcon(invoice.status)}
                          {invoice.status}
                        </span>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        {invoice.project}
                      </h3>
                    </div>

                    <div className="min-w-[190px]">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                            invoice.client
                          )} text-[10px] font-bold text-white`}
                        >
                          {getInitials(invoice.client)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {invoice.client}
                          </p>

                          <p className="truncate text-[11px] text-slate-400">
                            {invoice.clientEmail}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Amount
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </div>

                    <div className="hidden min-w-[165px] xl:block">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                          <CalendarDays className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Due Date
                          </p>

                          <p className="text-xs font-bold text-slate-700">
                            {formatDate(invoice.dueDate)}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            Issued{" "}
                            {formatDate(invoice.issueDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          showToast(
                            "Invoice preview will be available next.",
                            "info"
                          )
                        }
                        className="rounded-xl p-2.5 text-slate-400 transition hover:bg-violet-100 hover:text-violet-600"
                        title="View invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuId(
                              menuId === invoice.id
                                ? null
                                : invoice.id
                            )
                          }
                          className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuId === invoice.id && (
                          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            {invoice.status !== "Paid" && (
                              <button
                                onClick={() =>
                                  handleMarkPaid(invoice)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark as Paid
                              </button>
                            )}

                            <button
                              onClick={() =>
                                handleDuplicate(invoice)
                              }
                              disabled={saving}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate
                            </button>

                            <button
                              onClick={() => {
                                setDeleteId(invoice.id);
                                setMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-[74px] mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />

                      <span className="text-[10px] font-semibold text-slate-500">
                        {invoice.project}
                      </span>
                    </div>

                    <div className="h-3 w-px bg-slate-200" />

                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                      <span className="text-[10px] font-semibold text-slate-500">
                        Due {formatDate(invoice.dueDate)}
                      </span>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Status
                      </span>

                      <select
                        value={invoice.status}
                        onChange={(e) =>
                          handleStatusChange(
                            invoice,
                            e.target.value as InvoiceStatus
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 outline-none focus:border-violet-400"
                      >
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
                </div>
              ))}

              {filteredInvoices.length === 0 && (
                <div className="p-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
                    <Receipt className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    No invoices found
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Try another search or create a new invoice.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                      <Receipt className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">
                            {invoice.number}
                          </p>

                          <h3 className="mt-1 text-sm font-bold text-slate-900">
                            {invoice.project}
                          </h3>
                        </div>

                        <button
                          onClick={() =>
                            setMenuId(
                              menuId === invoice.id
                                ? null
                                : invoice.id
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                            invoice.client
                          )} text-[9px] font-bold text-white`}
                        >
                          {getInitials(invoice.client)}
                        </div>

                        <p className="text-xs font-semibold text-slate-700">
                          {invoice.client}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-violet-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-violet-400">
                        Amount
                      </p>

                      <p className="mt-1 text-sm font-bold text-violet-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-blue-400">
                        Due
                      </p>

                      <p className="mt-1 text-sm font-bold text-blue-900">
                        {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <select
                      value={invoice.status}
                      onChange={(e) =>
                        handleStatusChange(
                          invoice,
                          e.target.value as InvoiceStatus
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none ${getStatusStyle(
                        invoice.status
                      )}`}
                    >
                      {statusOptions.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        showToast(
                          "Invoice preview will be available next.",
                          "info"
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {menuId === invoice.id && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      {invoice.status !== "Paid" && (
                        <button
                          onClick={() =>
                            handleMarkPaid(invoice)
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark as Paid
                        </button>
                      )}

                      <button
                        onClick={() =>
                          handleDuplicate(invoice)
                        }
                        disabled={saving}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </button>

                      <button
                        onClick={() => {
                          setDeleteId(invoice.id);
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredInvoices.length === 0 && (
                <div className="p-12 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No invoices found
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Keep your cash flow moving
                  </p>

                  <p className="mt-1 text-xs text-violet-100">
                    Follow up on pending invoices and record payments as
                    they arrive.
                  </p>
                </div>
              </div>

              <a
                href="/payments"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-violet-100"
              >
                View Payments
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>

        {/* Add Invoice Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                      <Receipt className="h-4 w-4" />
                      Finance
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      Create Invoice
                    </h2>

                    <p className="mt-1 text-sm text-violet-100">
                      Create a professional invoice for your client.
                    </p>
                  </div>

                  <button
                    onClick={() => setAddOpen(false)}
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[78vh] overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Client */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Client *
                    </label>

                    <div className="relative">
                      <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={newInvoice.client}
                        onChange={(e) =>
                          handleClientChange(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="">
                          Select client
                        </option>

                        {clients.map((client) => (
                          <option
                            key={client.id}
                            value={client.name}
                          >
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project *
                    </label>

                    <div className="relative">
                      <BriefcaseBusiness className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={newInvoice.project}
                        onChange={(e) =>
                          handleProjectChange(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="">
                          Select project
                        </option>

                        {projects.map((project) => (
                          <option
                            key={project.id}
                            value={project.name}
                          >
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Client Email *
                    </label>

                    <input
                      type="email"
                      value={newInvoice.clientEmail}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          clientEmail: e.target.value,
                        }))
                      }
                      placeholder="client@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  {/* Issue date */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Issue Date *
                    </label>

                    <input
                      type="date"
                      value={newInvoice.issueDate}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          issueDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Due Date *
                    </label>

                    <input
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Tax %
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={newInvoice.tax}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          tax: e.target.value,
                        }))
                      }
                      placeholder="18"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Discount %
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={newInvoice.discount}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          discount: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={3}
                      value={newInvoice.description}
                      onChange={(e) =>
                        setNewInvoice((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Invoice notes or payment terms..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Invoice Items
                      </h3>

                      <p className="text-[11px] text-slate-400">
                        Add the services or deliverables being billed.
                      </p>
                    </div>

                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {newInvoice.items.map(
                      (item, index) => (
                        <div
                          key={item.id}
                          className="grid gap-3 p-4 sm:grid-cols-[1fr_100px_140px_40px]"
                        >
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                              Description
                            </label>

                            <input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder={`Service ${
                                index + 1
                              }`}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                              Qty
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
                              Rate
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "rate",
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                          </div>

                          <div className="flex items-end justify-end">
                            <button
                              onClick={() =>
                                removeItem(item.id)
                              }
                              disabled={
                                newInvoice.items
                                  .length === 1
                              }
                              className="rounded-lg p-2.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Total */}
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <div className="ml-auto max-w-xs space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal</span>

                        <span>
                          {formatCurrency(
                            invoiceSubtotal
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          Tax (
                          {Number(newInvoice.tax) ||
                            0}
                          %)
                        </span>

                        <span>
                          {formatCurrency(taxAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          Discount (
                          {Number(
                            newInvoice.discount
                          ) || 0}
                          %)
                        </span>

                        <span>
                          -
                          {formatCurrency(
                            discountAmount
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                        <span>Total</span>

                        <span className="text-violet-700">
                          {formatCurrency(invoiceTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setAddOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAddInvoice}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}

                    {saving
                      ? "Creating..."
                      : "Create Invoice"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Delete this invoice?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This invoice will be permanently removed from your
                workspace.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}

                  {saving
                    ? "Deleting..."
                    : "Delete Invoice"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}