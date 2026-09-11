"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  Mail,
  MoreHorizontal,
  Printer,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Invoice,
  InvoiceStatus,
} from "@/components/invoices/InvoiceModal";

const demoInvoices: Invoice[] = [
  {
    id: 1,
    number: "INV-2026-001",
    client: "Acme Corporation",
    clientEmail: "billing@acme.com",
    project: "Website Redesign",
    amount: 4500,
    status: "Sent",
    issueDate: "2026-08-20",
    dueDate: "2026-09-20",
    description: "Website redesign and frontend development.",
    items: [
      {
        id: 1,
        description: "UI/UX Design",
        quantity: 1,
        rate: 1500,
      },
      {
        id: 2,
        description: "Frontend Development",
        quantity: 1,
        rate: 3000,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 2,
    number: "INV-2026-002",
    client: "TechStart Inc.",
    clientEmail: "finance@techstart.com",
    project: "Mobile App",
    amount: 2800,
    status: "Paid",
    issueDate: "2026-08-15",
    dueDate: "2026-09-15",
    description: "Mobile application development.",
    items: [
      {
        id: 1,
        description: "Mobile App Development",
        quantity: 1,
        rate: 2800,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 3,
    number: "INV-2026-003",
    client: "Bright Labs",
    clientEmail: "accounts@brightlabs.com",
    project: "Brand Identity",
    amount: 1800,
    status: "Viewed",
    issueDate: "2026-08-10",
    dueDate: "2026-09-10",
    description: "Brand identity and visual design.",
    items: [
      {
        id: 1,
        description: "Brand Identity Package",
        quantity: 1,
        rate: 1800,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 4,
    number: "INV-2026-004",
    client: "Nova Solutions",
    clientEmail: "billing@novasolutions.com",
    project: "SEO Optimization",
    amount: 1200,
    status: "Overdue",
    issueDate: "2026-07-05",
    dueDate: "2026-08-05",
    description: "Monthly SEO optimization services.",
    items: [
      {
        id: 1,
        description: "SEO Optimization",
        quantity: 1,
        rate: 1200,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 5,
    number: "INV-2026-005",
    client: "Pixel Studio",
    clientEmail: "hello@pixelstudio.com",
    project: "Landing Page",
    amount: 950,
    status: "Draft",
    issueDate: "2026-09-01",
    dueDate: "2026-10-01",
    description: "Landing page design and development.",
    items: [
      {
        id: 1,
        description: "Landing Page",
        quantity: 1,
        rate: 950,
      },
    ],
    tax: 0,
    discount: 0,
  },
];

const statusStyles: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  Viewed: "bg-violet-50 text-violet-700 border-violet-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const statusIcons: Record<InvoiceStatus, typeof FileText> = {
  Draft: FileText,
  Sent: Send,
  Viewed: Clock3,
  Paid: CheckCircle2,
  Overdue: XCircle,
  Cancelled: XCircle,
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const invoiceId = Number(params.id);

  const invoice = useMemo(
    () => demoInvoices.find((item) => item.id === invoiceId),
    [invoiceId]
  );

  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus>(
    invoice?.status ?? "Draft"
  );

  const [menuOpen, setMenuOpen] = useState(false);

  if (!invoice) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Invoice not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              The invoice you are looking for does not exist.
            </p>

            <Link
              href="/invoices"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  const taxAmount = subtotal * (invoice.tax / 100);
  const discountAmount = subtotal * (invoice.discount / 100);
  const total = subtotal + taxAmount - discountAmount;

  const StatusIcon = statusIcons[currentStatus];

  const formattedDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const updateStatus = (status: InvoiceStatus) => {
    setCurrentStatus(status);

    const messages: Record<InvoiceStatus, string> = {
      Draft: "Invoice moved to draft.",
      Sent: "Invoice marked as sent.",
      Viewed: "Invoice marked as viewed.",
      Paid: "Invoice marked as paid.",
      Overdue: "Invoice marked as overdue.",
      Cancelled: "Invoice cancelled.",
    };

    const type =
      status === "Paid"
        ? "success"
        : status === "Cancelled"
          ? "warning"
          : "success";

    showToast(messages[status], type);
  };

  const handleSend = () => {
    setCurrentStatus("Sent");
    showToast("Invoice sent successfully.", "success");
  };

  const handleMarkPaid = () => {
    setCurrentStatus("Paid");
    showToast("Invoice marked as paid.", "success");
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete ${invoice.number}? This action cannot be undone.`
    );

    if (!confirmed) return;

    showToast("Invoice deleted successfully.", "success");
    router.push("/invoices");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/invoices"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {invoice.number}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[currentStatus]}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {currentStatus}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Created on {formattedDate(invoice.issueDate)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>

              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Send className="h-4 w-4" />
                Send
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        showToast(
                          "Invoice editing will be connected to persistent storage next.",
                          "info"
                        );
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Invoice
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        updateStatus("Cancelled");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Invoice
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Invoice Total
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatCurrency(total)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Due Date
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formattedDate(invoice.dueDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Payment Status
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-xl font-bold text-slate-900">
                  {currentStatus === "Paid" ? "Paid" : "Outstanding"}
                </p>

                {currentStatus !== "Paid" &&
                  currentStatus !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={handleMarkPaid}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Mark Paid
                    </button>
                  )}
              </div>
            </div>
          </div>

          {/* Invoice document */}
          <div
            id="invoice-document"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Invoice top */}
            <div className="border-b border-slate-200 px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                      <FileText className="h-5 w-5 text-white" />
                    </div>

                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        FreelanceOS
                      </p>
                      <p className="text-xs text-slate-500">
                        Freelancer Management Platform
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    INVOICE
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {invoice.number}
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-8 sm:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Bill To
                  </p>

                  <p className="font-semibold text-slate-900">
                    {invoice.client}
                  </p>

                  <a
                    href={`mailto:${invoice.clientEmail}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {invoice.clientEmail}
                  </a>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Project
                  </p>

                  <p className="font-semibold text-slate-900">
                    {invoice.project}
                  </p>
                </div>

                <div>
                  <div className="mb-3 flex justify-between gap-4">
                    <span className="text-sm text-slate-500">
                      Issue Date
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formattedDate(invoice.issueDate)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-slate-500">Due Date</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formattedDate(invoice.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {invoice.description && (
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-10">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {invoice.description}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="px-6 py-8 sm:px-10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Description
                      </th>

                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Qty
                      </th>

                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Rate
                      </th>

                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoice.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-4 text-sm font-medium text-slate-900">
                          {item.description}
                        </td>

                        <td className="py-4 text-right text-sm text-slate-600">
                          {item.quantity}
                        </td>

                        <td className="py-4 text-right text-sm text-slate-600">
                          {formatCurrency(item.rate)}
                        </td>

                        <td className="py-4 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(item.quantity * item.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between gap-6 text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {invoice.tax > 0 && (
                    <div className="flex justify-between gap-6 text-sm">
                      <span className="text-slate-500">
                        Tax ({invoice.tax}%)
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}

                  {invoice.discount > 0 && (
                    <div className="flex justify-between gap-6 text-sm">
                      <span className="text-slate-500">
                        Discount ({invoice.discount}%)
                      </span>
                      <span className="font-medium text-slate-900">
                        -{formatCurrency(discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-end justify-between gap-6">
                      <span className="text-base font-semibold text-slate-900">
                        Total
                      </span>

                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-10">
              <p className="text-sm font-semibold text-slate-900">
                Thank you for your business.
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Please make payment by the due date shown above. Contact us if
                you have any questions regarding this invoice.
              </p>
            </div>
          </div>

          {/* Status controls */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Invoice Status
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the current status of this invoice.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "Draft",
                    "Sent",
                    "Viewed",
                    "Paid",
                    "Overdue",
                    "Cancelled",
                  ] as InvoiceStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateStatus(status)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      currentStatus === status
                        ? statusStyles[status]
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-8" />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          aside,
          header,
          nav,
          button,
          a[href="/invoices"],
          #invoice-document ~ * {
            display: none !important;
          }

          #invoice-document {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </AppShell>
  );
}