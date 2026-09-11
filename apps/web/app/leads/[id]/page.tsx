"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Edit3,
  Mail,
  Phone,
  Rocket,
  Send,
  Target,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { Lead } from "@/components/leads/LeadModal";
import { useToast } from "@/components/ui/ToastProvider";

type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Won"
  | "Lost";

const initialLeads: Lead[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    company: "TechFlow",
    email: "rahul@techflow.com",
    phone: "+91 98765 11111",
    value: 125000,
    status: "New",
    source: "Website",
    createdAt: "2026-09-01",
  },
  {
    id: 2,
    name: "Priya Mehta",
    company: "Nova Labs",
    email: "priya@novalabs.com",
    phone: "+91 98765 22222",
    value: 85000,
    status: "Contacted",
    source: "Referral",
    createdAt: "2026-08-29",
  },
  {
    id: 3,
    name: "Arjun Kapoor",
    company: "Bright Media",
    email: "arjun@brightmedia.com",
    phone: "+91 98765 33333",
    value: 200000,
    status: "Qualified",
    source: "LinkedIn",
    createdAt: "2026-08-27",
  },
  {
    id: 4,
    name: "Ananya Singh",
    company: "GreenTech",
    email: "ananya@greentech.com",
    phone: "+91 98765 44444",
    value: 150000,
    status: "Proposal",
    source: "Website",
    createdAt: "2026-08-24",
  },
  {
    id: 5,
    name: "Vikram Patel",
    company: "Pixel Works",
    email: "vikram@pixelworks.com",
    phone: "+91 98765 55555",
    value: 95000,
    status: "Won",
    source: "Referral",
    createdAt: "2026-08-20",
  },
  {
    id: 6,
    name: "Neha Gupta",
    company: "CloudNine",
    email: "neha@cloudnine.com",
    phone: "+91 98765 66666",
    value: 60000,
    status: "Lost",
    source: "Upwork",
    createdAt: "2026-08-18",
  },
];

const stages: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
];

const stageStyles: Record<
  LeadStatus,
  {
    badge: string;
    icon: string;
    bar: string;
    bg: string;
  }
> = {
  New: {
    badge: "bg-blue-100 text-blue-700",
    icon: "bg-blue-100 text-blue-600",
    bar: "bg-blue-500",
    bg: "from-blue-50 to-white",
  },
  Contacted: {
    badge: "bg-purple-100 text-purple-700",
    icon: "bg-purple-100 text-purple-600",
    bar: "bg-purple-500",
    bg: "from-purple-50 to-white",
  },
  Qualified: {
    badge: "bg-amber-100 text-amber-700",
    icon: "bg-amber-100 text-amber-600",
    bar: "bg-amber-500",
    bg: "from-amber-50 to-white",
  },
  Proposal: {
    badge: "bg-orange-100 text-orange-700",
    icon: "bg-orange-100 text-orange-600",
    bar: "bg-orange-500",
    bg: "from-orange-50 to-white",
  },
  Won: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: "bg-emerald-100 text-emerald-600",
    bar: "bg-emerald-500",
    bg: "from-emerald-50 to-white",
  },
  Lost: {
    badge: "bg-red-100 text-red-700",
    icon: "bg-red-100 text-red-600",
    bar: "bg-red-500",
    bg: "from-red-50 to-white",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getCompanyInitials(company: string) {
  return company
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const { showToast } = useToast();

  const leadId = Number(params.id);

  const foundLead = initialLeads.find(
    (item) => item.id === leadId,
  );

  const [lead, setLead] = useState<Lead | null>(
    foundLead ?? null,
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const currentStageIndex = useMemo(() => {
    if (!lead || lead.status === "Lost") {
      return -1;
    }

    return stages.indexOf(lead.status);
  }, [lead]);

  const progress =
    currentStageIndex >= 0
      ? Math.round(
          ((currentStageIndex + 1) / stages.length) * 100,
        )
      : 0;

  if (!lead) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-7 w-7 text-slate-400" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Lead not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This lead may have been removed or does not exist.
            </p>

            <Link
              href="/leads"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Leads
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const styles = stageStyles[lead.status];

  const handleStatusChange = (status: LeadStatus) => {
    setLead((current) =>
      current
        ? {
            ...current,
            status,
          }
        : current,
    );

    showToast(
      `Lead moved to ${status}.`,
      "success",
    );
  };

  const handleDelete = () => {
    setDeleteOpen(false);

    showToast(
      "Lead deleted successfully.",
      "success",
    );

    router.push("/leads");
  };

  const handleConvert = () => {
    setConvertOpen(false);

    showToast(
      "Lead marked for client conversion. Shared client persistence will be connected next.",
      "success",
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Back */}
          <Link
            href="/leads"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Link>

          {/* Hero */}
          <section
            className={`overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${styles.bg} shadow-sm`}
          >
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col justify-between gap-7 lg:flex-row">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold shadow-sm sm:h-20 sm:w-20 sm:text-xl ${styles.icon}`}
                    >
                      {getInitials(lead.name)}
                    </div>

                    <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white bg-slate-900 text-[9px] font-bold text-white shadow-sm">
                      {getCompanyInitials(lead.company)}
                    </div>
                  </div>

                  {/* Identity */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {lead.name}
                      </h1>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                          <Building2
                            size={14}
                            className="text-slate-600"
                          />
                        </span>

                        {lead.company}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CalendarDays size={14} />
                        Added {lead.createdAt}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Rocket size={16} />
                    Convert to Client
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Mail
                    size={16}
                    className="text-blue-500"
                  />
                  Email Lead
                </a>

                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Phone
                      size={16}
                      className="text-emerald-500"
                    />
                    Call Lead
                  </a>
                )}

                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-sm">
                  <Target
                    size={16}
                    className="text-purple-500"
                  />
                  {lead.source}
                </span>
              </div>
            </div>
          </section>

          {/* KPI cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <CircleDollarSign
                    size={20}
                    className="text-blue-600"
                  />
                </div>

                <ArrowUpRight
                  size={16}
                  className="text-blue-400"
                />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Estimated Deal Value
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                ₹{lead.value.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <Target
                  size={20}
                  className="text-purple-600"
                />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Current Stage
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {lead.status}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Clock3
                  size={20}
                  className="text-amber-600"
                />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Lead Age
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                Active
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2
                  size={20}
                  className="text-emerald-600"
                />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                Pipeline Progress
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {progress}%
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Main content */}
            <div className="space-y-6">
              {/* Pipeline */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Sales Pipeline
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Move this lead through your sales process.
                    </p>
                  </div>

                  <div className="relative">
                    <select
                      value={lead.status}
                      onChange={(event) =>
                        handleStatusChange(
                          event.target.value as LeadStatus,
                        )
                      }
                      className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">
                        Contacted
                      </option>
                      <option value="Qualified">
                        Qualified
                      </option>
                      <option value="Proposal">
                        Proposal
                      </option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {lead.status === "Lost" ? (
                  <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                        <Target
                          size={17}
                          className="text-red-600"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Lead marked as Lost
                        </p>

                        <p className="mt-0.5 text-xs text-red-600">
                          You can move it back into the pipeline at any
                          time.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <div className="flex items-center">
                      {stages.map((stage, index) => {
                        const completed =
                          index <= currentStageIndex;

                        const active =
                          stage === lead.status;

                        return (
                          <div
                            key={stage}
                            className="flex min-w-0 flex-1 items-center"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                                  completed
                                    ? `${stageStyles[stage].bar} border-transparent text-white`
                                    : "border-slate-200 bg-white text-slate-400"
                                }`}
                              >
                                {completed ? (
                                  <Check size={15} />
                                ) : (
                                  index + 1
                                )}
                              </div>

                              <span
                                className={`mt-2 text-[10px] font-semibold sm:text-xs ${
                                  active
                                    ? "text-slate-900"
                                    : "text-slate-400"
                                }`}
                              >
                                {stage}
                              </span>
                            </div>

                            {index < stages.length - 1 && (
                              <div
                                className={`mx-2 mt-[-20px] h-1 flex-1 rounded-full ${
                                  index <
                                  currentStageIndex
                                    ? stageStyles[
                                        stages[
                                          index
                                        ]
                                      ].bar
                                    : "bg-slate-100"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Activity */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Activity
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Recent activity for this lead.
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                    <Clock3
                      size={17}
                      className="text-blue-600"
                    />
                  </div>
                </div>

                <div className="relative mt-6 space-y-6 pl-8">
                  <div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200" />

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-100">
                      <Users
                        size={13}
                        className="text-blue-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Lead created
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {lead.name} was added to your sales pipeline
                      from {lead.source}.
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {lead.createdAt}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-purple-100">
                      <Send
                        size={13}
                        className="text-purple-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Current pipeline stage
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Lead is currently in the{" "}
                      <span className="font-semibold text-slate-700">
                        {lead.status}
                      </span>{" "}
                      stage.
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Recently updated
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Contact */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-bold text-slate-900">
                  Contact Information
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <Mail
                        size={16}
                        className="text-blue-600"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </p>

                      <a
                        href={`mailto:${lead.email}`}
                        className="mt-1 block truncate text-sm font-medium text-slate-800 hover:text-blue-600"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <Phone
                        size={16}
                        className="text-emerald-600"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Phone
                      </p>

                      <a
                        href={`tel:${lead.phone}`}
                        className="mt-1 block text-sm font-medium text-slate-800 hover:text-emerald-600"
                      >
                        {lead.phone || "Not provided"}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                      <Building2
                        size={16}
                        className="text-purple-600"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Company
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {lead.company}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Deal */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-300">
                        Estimated deal
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        ₹{lead.value.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <CircleDollarSign size={24} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Source
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                      {lead.source}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Created
                    </span>

                    <span className="text-xs font-semibold text-slate-700">
                      {lead.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Status
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles.badge}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </div>
              </section>

              {/* Convert */}
              <button
                type="button"
                onClick={() => setConvertOpen(true)}
                className="group w-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                    <Rocket
                      size={20}
                      className="text-emerald-600"
                    />
                  </div>

                  <ArrowRight
                    size={17}
                    className="text-emerald-400 transition group-hover:translate-x-1"
                  />
                </div>

                <p className="mt-4 text-sm font-bold text-slate-900">
                  Ready to work together?
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Convert this prospect into a client and continue
                  the workflow.
                </p>
              </button>
            </aside>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Lead
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Update the lead information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              className="space-y-5 p-6"
              onSubmit={(event) => {
                event.preventDefault();

                setEditOpen(false);

                showToast(
                  "Lead updated successfully.",
                  "success",
                );
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Name
                  </label>

                  <input
                    value={lead.name}
                    onChange={(event) =>
                      setLead({
                        ...lead,
                        name: event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Company
                  </label>

                  <input
                    value={lead.company}
                    onChange={(event) =>
                      setLead({
                        ...lead,
                        company: event.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={lead.email}
                  onChange={(event) =>
                    setLead({
                      ...lead,
                      email: event.target.value,
                    })
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Phone
                </label>

                <input
                  value={lead.phone}
                  onChange={(event) =>
                    setLead({
                      ...lead,
                      phone: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Deal Value
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={lead.value}
                    onChange={(event) =>
                      setLead({
                        ...lead,
                        value: Number(
                          event.target.value,
                        ),
                      })
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-3.5 text-sm text-slate-900 outline-none focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <Trash2
                size={21}
                className="text-red-600"
              />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Delete this lead?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will remove {lead.name} from your current lead
              list. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert confirmation */}
      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-50 to-white p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Rocket
                  size={22}
                  className="text-emerald-600"
                />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Convert to Client?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You're about to convert{" "}
                <span className="font-semibold text-slate-800">
                  {lead.name}
                </span>{" "}
                from a lead into a client.
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                  {getInitials(lead.name)}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {lead.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {lead.company}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-xs font-medium text-emerald-700">
                  Deal value
                </span>

                <span className="text-sm font-bold text-emerald-800">
                  ₹{lead.value.toLocaleString("en-IN")}
                </span>
              </div>

              <p className="text-[11px] leading-5 text-slate-400">
                Client persistence and cross-page synchronization will
                be connected when we add shared application storage.
              </p>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setConvertOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConvert}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Check size={15} />
                  Convert Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}