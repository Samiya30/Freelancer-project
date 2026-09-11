"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { PaymentMethod, PaymentStatus } from "@/lib/store/FreelanceStore";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  ApiPayment,
  PaymentMethod as ApiPaymentMethod,
  PaymentStatus as ApiPaymentStatus,
} from "@/lib/api/payments";
import { getInvoices, ApiInvoice } from "@/lib/api/invoices";
import {
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle2,
  Clock3,
  AlertCircle,
  IndianRupee,
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
  CalendarDays,
  Receipt,
  Trash2,
  Copy,
  Download,
  X,
  ArrowRight,
  TrendingUp,
  WalletCards,
} from "lucide-react";

const statuses: PaymentStatus[] = [
  "Completed",
  "Pending",
  "Failed",
];

const methods: PaymentMethod[] = [
  "UPI",
  "Bank Transfer",
  "Card",
  "Cash",
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function mapApiMethodToUi(method: ApiPaymentMethod): PaymentMethod {
  return method === "BankTransfer" ? "Bank Transfer" : method;
}

function mapUiMethodToApi(method: PaymentMethod): ApiPaymentMethod {
  return method === "Bank Transfer" ? "BankTransfer" : method;
}

function mapApiStatusToUi(status: ApiPaymentStatus): PaymentStatus {
  return status;
}

function mapUiStatusToApi(status: PaymentStatus): ApiPaymentStatus {
  return status;
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().split("T")[0];
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

function getStatusStyle(status: PaymentStatus) {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Failed":
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

function getMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "UPI":
      return <Smartphone className="h-4 w-4" />;
    case "Bank Transfer":
      return <Landmark className="h-4 w-4" />;
    case "Card":
      return <CreditCard className="h-4 w-4" />;
    case "Cash":
      return <Banknote className="h-4 w-4" />;
  }
}

function getMethodStyle(method: PaymentMethod) {
  switch (method) {
    case "UPI":
      return "bg-violet-50 text-violet-700";
    case "Bank Transfer":
      return "bg-blue-50 text-blue-700";
    case "Card":
      return "bg-cyan-50 text-cyan-700";
    case "Cash":
      return "bg-emerald-50 text-emerald-700";
  }
}

interface UiPayment {
  id: number;
  paymentNumber: string;
  clientName: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  clientId: number | null;
  invoiceId: number | null;
  projectId: number | null;
}

function toUiPayment(payment: ApiPayment): UiPayment {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    clientName: payment.clientName,
    invoiceNumber: payment.invoiceNumber,
    projectName: payment.projectName,
    amount: payment.amount,
    date: formatDate(payment.date),
    method: mapApiMethodToUi(payment.method),
    status: mapApiStatusToUi(payment.status),
    clientId: payment.clientId,
    invoiceId: payment.invoiceId,
    projectId: payment.projectId,
  };
}

export default function PaymentsPage() {
  const { showToast } = useToast();

  const [payments, setPayments] = useState<UiPayment[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | PaymentStatus
  >("All");
  const [methodFilter, setMethodFilter] = useState<
    "All" | PaymentMethod
  >("All");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [newPayment, setNewPayment] = useState({
    invoiceNumber: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "UPI" as PaymentMethod,
    status: "Completed" as PaymentStatus,
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [paymentsResponse, invoicesResponse] = await Promise.all([
          getPayments(),
          getInvoices(),
        ]);

        if (!mounted) return;

        setPayments(
          (paymentsResponse.data ?? []).map(toUiPayment)
        );

        setInvoices(invoicesResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load payments:", error);

        if (mounted) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load payments.",
            "error"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !query ||
        payment.paymentNumber.toLowerCase().includes(query) ||
        payment.clientName.toLowerCase().includes(query) ||
        payment.invoiceNumber.toLowerCase().includes(query) ||
        payment.projectName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        payment.status === statusFilter;

      const matchesMethod =
        methodFilter === "All" ||
        payment.method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [
    payments,
    search,
    statusFilter,
    methodFilter,
  ]);

  const completedPayments = payments
    .filter((payment) => payment.status === "Completed")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingPayments = payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const failedPayments = payments
    .filter((payment) => payment.status === "Failed")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalTransactions = payments.length;

  const handleInvoiceChange = (invoiceNumber: string) => {
    const invoice = invoices.find(
      (item) => item.number === invoiceNumber
    );

    if (!invoice) {
      setNewPayment({
        ...newPayment,
        invoiceNumber,
      });
      return;
    }

    setNewPayment({
      ...newPayment,
      invoiceNumber,
      amount: String(invoice.amount),
    });
  };

  const generatePaymentNumber = () => {
    const year = new Date().getFullYear();

    return `PAY-${year}-${String(
      payments.length + 1
    ).padStart(3, "0")}`;
  };

  const handleAddPayment = async () => {
    if (
      !newPayment.invoiceNumber ||
      !newPayment.amount ||
      !newPayment.date
    ) {
      showToast("Please complete all required fields.", "error");
      return;
    }

    const invoice = invoices.find(
      (item) => item.number === newPayment.invoiceNumber
    );

    if (!invoice) {
      showToast("Please select a valid invoice.", "error");
      return;
    }

    const amount = Number(newPayment.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    try {
      setSaving(true);

      const response = await createPayment({
        paymentNumber: generatePaymentNumber(),
        clientName: invoice.client,
        invoiceNumber: invoice.number,
        projectName: invoice.project,
        amount,
        date: newPayment.date,
        method: mapUiMethodToApi(newPayment.method),
        status: mapUiStatusToApi(newPayment.status),
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        projectId: invoice.projectId,
      });

      if (response.data) {
        setPayments((current) => [
          toUiPayment(response.data!),
          ...current,
        ]);
      }

      setNewPayment({
        invoiceNumber: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "UPI",
        status: "Completed",
      });

      setAddOpen(false);

      showToast("Payment recorded successfully.", "success");
    } catch (error) {
      console.error("Failed to create payment:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to record payment.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    payment: UiPayment,
    status: PaymentStatus
  ) => {
    try {
      setSaving(true);

      const response = await updatePayment(payment.id, {
        status: mapUiStatusToApi(status),
      });

      if (response.data) {
        const updatedPayment = toUiPayment(response.data);

        setPayments((current) =>
          current.map((item) =>
            item.id === payment.id ? updatedPayment : item
          )
        );
      }

      showToast(
        `${payment.paymentNumber} updated to ${status}.`,
        "success"
      );
    } catch (error) {
      console.error("Failed to update payment:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update payment.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (payment: UiPayment) => {
    try {
      setSaving(true);

      const response = await createPayment({
        paymentNumber: generatePaymentNumber(),
        clientName: payment.clientName,
        invoiceNumber: payment.invoiceNumber,
        projectName: payment.projectName,
        amount: payment.amount,
        date: payment.date,
        method: mapUiMethodToApi(payment.method),
        status: "Pending",
        clientId: payment.clientId,
        invoiceId: payment.invoiceId,
        projectId: payment.projectId,
      });

      if (response.data) {
        setPayments((current) => [
          toUiPayment(response.data!),
          ...current,
        ]);
      }

      setMenuId(null);

      showToast("Payment duplicated.", "success");
    } catch (error) {
      console.error("Failed to duplicate payment:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate payment.",
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

      await deletePayment(deleteId);

      setPayments((current) =>
        current.filter((payment) => payment.id !== deleteId)
      );

      setDeleteId(null);
      setMenuId(null);

      showToast("Payment deleted successfully.", "success");
    } catch (error) {
      console.error("Failed to delete payment:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete payment.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Payment",
      "Client",
      "Invoice",
      "Project",
      "Amount",
      "Date",
      "Method",
      "Status",
    ];

    const rows = filteredPayments.map((payment) => [
      payment.paymentNumber,
      payment.clientName,
      payment.invoiceNumber,
      payment.projectName,
      payment.amount,
      payment.date,
      payment.method,
      payment.status,
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
    link.download = "freelanceos-payments.csv";
    link.click();

    URL.revokeObjectURL(url);

    showToast("Payment CSV exported.", "success");
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <WalletCards className="h-3.5 w-3.5" />
                  Finance
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Payments
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Track incoming payments and keep your cash flow organized.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>

                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Completed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {formatCurrency(completedPayments)}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Successfully received
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Pending
                  </p>

                  <p className="mt-2 text-3xl font-bold text-amber-950">
                    {formatCurrency(pendingPayments)}
                  </p>

                  <p className="mt-1 text-xs text-amber-600">
                    Awaiting confirmation
                  </p>
                </div>

                <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-700">
                    Failed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-rose-950">
                    {formatCurrency(failedPayments)}
                  </p>

                  <p className="mt-1 text-xs text-rose-600">
                    Needs attention
                  </p>
                </div>

                <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Transactions
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {totalTransactions}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Recorded payments
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Cash Flow
                </div>

                <h2 className="mt-4 text-2xl font-bold">
                  {formatCurrency(completedPayments)}
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Total successfully collected from clients.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wide text-slate-300">
                    Completed
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {payments.filter(
                      (payment) => payment.status === "Completed"
                    ).length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wide text-slate-300">
                    Pending
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {payments.filter(
                      (payment) => payment.status === "Pending"
                    ).length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wide text-slate-300">
                    Failed
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {payments.filter(
                      (payment) => payment.status === "Failed"
                    ).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payments, clients, invoices or projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "All" | PaymentStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="All">All Statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={methodFilter}
                onChange={(e) =>
                  setMethodFilter(
                    e.target.value as "All" | PaymentMethod
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="All">All Methods</option>

                {methods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Workspace */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-cyan-50/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Payment Transactions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Review incoming payments and transaction status.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {loading
                    ? "Loading..."
                    : `${filteredPayments.length} transactions`}
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              {loading ? (
                <div className="p-14 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    Loading payments...
                  </p>
                </div>
              ) : (
                <>
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="group border-b border-slate-100 p-5 transition hover:bg-emerald-50/20"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                            payment.clientName
                          )} text-white shadow-sm`}
                        >
                          {getMethodIcon(payment.method)}
                        </div>

                        <div className="min-w-[230px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">
                              {payment.paymentNumber}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                                payment.status
                              )}`}
                            >
                              {payment.status}
                            </span>
                          </div>

                          <h3 className="mt-1 text-sm font-bold text-slate-900">
                            {payment.clientName}
                          </h3>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {payment.projectName}
                          </p>
                        </div>

                        <div className="min-w-[130px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Invoice
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {payment.invoiceNumber}
                          </p>
                        </div>

                        <div className="min-w-[130px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Amount
                          </p>

                          <p className="mt-1 text-sm font-bold text-emerald-600">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>

                        <div className="min-w-[120px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Date
                          </p>

                          <div className="mt-1 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                            <span className="text-xs font-semibold text-slate-700">
                              {payment.date}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[130px]">
                          <span
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${getMethodStyle(
                              payment.method
                            )}`}
                          >
                            {getMethodIcon(payment.method)}
                            {payment.method}
                          </span>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenuId(
                                menuId === payment.id
                                  ? null
                                  : payment.id
                              )
                            }
                            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {menuId === payment.id && (
                            <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                              <button
                                onClick={() =>
                                  handleDuplicate(payment)
                                }
                                disabled={saving}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteId(payment.id);
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

                      <div className="ml-[74px] mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">
                            Payment received through
                          </span>

                          <span className="text-[10px] font-bold text-slate-600">
                            {payment.method}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            Status
                          </span>

                          <select
                            value={payment.status}
                            disabled={saving}
                            onChange={(e) =>
                              handleStatusChange(
                                payment,
                                e.target.value as PaymentStatus
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold outline-none disabled:opacity-50 ${getStatusStyle(
                              payment.status
                            )}`}
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredPayments.length === 0 && (
                    <div className="p-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400">
                        <WalletCards className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No payments found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another filter or record a new payment.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {loading ? (
                <div className="p-14 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    Loading payments...
                  </p>
                </div>
              ) : (
                <>
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                            payment.clientName
                          )} text-white`}
                        >
                          {getMethodIcon(payment.method)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">
                                {payment.paymentNumber}
                              </p>

                              <h3 className="mt-1 text-sm font-bold text-slate-900">
                                {payment.clientName}
                              </h3>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {payment.invoiceNumber}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setMenuId(
                                  menuId === payment.id
                                    ? null
                                    : payment.id
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <p className="text-[10px] font-semibold uppercase text-emerald-500">
                            Amount
                          </p>

                          <p className="mt-1 text-sm font-bold text-emerald-900">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-blue-50 p-3">
                          <p className="text-[10px] font-semibold uppercase text-blue-500">
                            Date
                          </p>

                          <p className="mt-1 text-sm font-bold text-blue-900">
                            {payment.date}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                            payment.status
                          )}`}
                        >
                          {payment.status === "Completed" && (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}

                          {payment.status === "Pending" && (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}

                          {payment.status === "Failed" && (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}

                          {payment.status}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${getMethodStyle(
                            payment.method
                          )}`}
                        >
                          {getMethodIcon(payment.method)}
                          {payment.method}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredPayments.length === 0 && (
                    <div className="p-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400">
                        <WalletCards className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No payments found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another filter or record a new payment.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Receipt className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Keep your financial records connected
                  </p>

                  <p className="mt-1 text-xs text-emerald-100">
                    Review expenses and understand your real business profit.
                  </p>
                </div>
              </div>

              <a
                href="/expenses"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-emerald-100"
              >
                View Expenses
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>

        {/* Add Payment Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                      <WalletCards className="h-4 w-4" />
                      Finance
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      Record Payment
                    </h2>

                    <p className="mt-1 text-sm text-emerald-100">
                      Link the payment to an existing invoice.
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

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Invoice *
                  </label>

                  <select
                    value={newPayment.invoiceNumber}
                    onChange={(e) =>
                      handleInvoiceChange(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Select invoice</option>

                    {invoices.map((invoice) => (
                      <option
                        key={invoice.id}
                        value={invoice.number}
                      >
                        {invoice.number} — {invoice.client} —{" "}
                        {formatCurrency(invoice.amount)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Amount *
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={newPayment.amount}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            amount: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Date *
                    </label>

                    <input
                      type="date"
                      value={newPayment.date}
                      onChange={(e) =>
                        setNewPayment({
                          ...newPayment,
                          date: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Payment Method
                    </label>

                    <select
                      value={newPayment.method}
                      onChange={(e) =>
                        setNewPayment({
                          ...newPayment,
                          method: e.target.value as PaymentMethod,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    >
                      {methods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={newPayment.status}
                      onChange={(e) =>
                        setNewPayment({
                          ...newPayment,
                          status: e.target.value as PaymentStatus,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        Payment will be linked to the invoice
                      </p>

                      <p className="mt-1 text-xs text-emerald-600">
                        Client and project details are automatically taken
                        from the selected invoice.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setAddOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAddPayment}
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Record Payment"}
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
                Delete this payment?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This transaction will be permanently removed from your
                records.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {saving ? "Deleting..." : "Delete Payment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}