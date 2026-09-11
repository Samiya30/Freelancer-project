"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  Mail,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Proposal,
  ProposalStatus,
} from "@/components/proposals/ProposalModal";

const demoProposals: Proposal[] = [
  {
    id: 1,
    number: "PROP-2026-001",
    title: "E-commerce Website Development",
    client: "Urban Threads",
    clientEmail: "aarav@urbanthreads.com",
    value: 120000,
    status: "Sent",
    createdAt: "2026-09-01",
    validUntil: "2026-09-15",
    description:
      "Complete e-commerce website design and development.",
  },
  {
    id: 2,
    number: "PROP-2026-002",
    title: "Brand Identity Package",
    client: "Nova Studio",
    clientEmail: "priya@novastudio.com",
    value: 85000,
    status: "Viewed",
    createdAt: "2026-08-29",
    validUntil: "2026-09-12",
    description:
      "Complete brand identity including logo, colors and typography.",
  },
  {
    id: 3,
    number: "PROP-2026-003",
    title: "Marketing Website",
    client: "GreenTech",
    clientEmail: "ananya@greentech.com",
    value: 150000,
    status: "Accepted",
    createdAt: "2026-08-25",
    validUntil: "2026-09-10",
    description:
      "Modern responsive marketing website for GreenTech.",
  },
  {
    id: 4,
    number: "PROP-2026-004",
    title: "Mobile App UI/UX",
    client: "Acme Technologies",
    clientEmail: "arjun@acme.com",
    value: 200000,
    status: "Draft",
    createdAt: "2026-08-22",
    validUntil: "2026-09-20",
    description:
      "UI/UX design system and mobile application screens.",
  },
  {
    id: 5,
    number: "PROP-2026-005",
    title: "Social Media Design",
    client: "Pixel Works",
    clientEmail: "vikram@pixelworks.com",
    value: 65000,
    status: "Rejected",
    createdAt: "2026-08-18",
    validUntil: "2026-09-01",
    description:
      "Monthly social media creative design package.",
  },
];

const statusStyles: Record<ProposalStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-purple-100 text-purple-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Expired: "bg-orange-100 text-orange-700",
};

const stages: ProposalStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
];

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function ProposalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const id = Number(params.id);

  const found = demoProposals.find(
    (proposal) => proposal.id === id,
  );

  const [proposal, setProposal] =
    useState<Proposal | null>(found ?? null);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  if (!proposal) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <FileSignature
              size={36}
              className="mx-auto text-slate-300"
            />

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Proposal not found
            </h1>

            <Link
              href="/proposals"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft size={15} />
              Back to Proposals
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const updateStatus = (
    newStatus: ProposalStatus,
  ) => {
    setProposal({
      ...proposal,
      status: newStatus,
    });

    showToast(
      `Proposal marked as ${newStatus}.`,
      "success",
    );
  };

  const handleDelete = () => {
    setDeleteOpen(false);

    showToast(
      "Proposal deleted successfully.",
      "success",
    );

    router.push("/proposals");
  };

  const currentStage =
    stages.indexOf(proposal.status);

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Back */}
          <Link
            href="/proposals"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={15} />
            Back to Proposals
          </Link>

          {/* Hero */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 text-white shadow-xl shadow-purple-500/10">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-6 lg:flex-row">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                      {proposal.number}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[proposal.status]}`}
                    >
                      {proposal.status}
                    </span>
                  </div>

                  <h1 className="max-w-3xl text-2xl font-bold sm:text-3xl">
                    {proposal.title}
                  </h1>

                  <p className="mt-3 text-sm text-purple-100">
                    Proposal for {proposal.client}
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="text-xs text-purple-100">
                    Proposal Value
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {money(proposal.value)}
                  </p>

                  <p className="mt-2 text-xs text-purple-100">
                    Valid until {proposal.validUntil}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Progress */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Proposal Progress
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Track the proposal through your sales pipeline.
                </p>
              </div>

              <Clock3
                size={18}
                className="text-purple-500"
              />
            </div>

            <div className="mt-7 flex items-center">
              {stages.map((stage, index) => {
                const completed =
                  index <= currentStage;

                return (
                  <div
                    key={stage}
                    className="flex flex-1 items-center"
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          completed
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <span
                        className={`absolute top-11 whitespace-nowrap text-[10px] font-bold ${
                          completed
                            ? "text-purple-600"
                            : "text-slate-400"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>

                    {index < stages.length - 1 && (
                      <div
                        className={`mx-2 h-1 flex-1 rounded-full ${
                          index < currentStage
                            ? "bg-purple-500"
                            : "bg-slate-100"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-5" />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Main */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">
                    Proposal Details
                  </h2>

                  <FileSignature
                    size={18}
                    className="text-purple-500"
                  />
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {proposal.description ||
                      "No description has been added to this proposal."}
                  </p>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {proposal.createdAt}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Valid Until
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {proposal.validUntil}
                    </p>
                  </div>
                </div>
              </section>

              {/* Activity */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Activity
                </h2>

                <div className="relative mt-6 space-y-6 pl-8">
                  <div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200" />

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-purple-100">
                      <FileText
                        size={13}
                        className="text-purple-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Proposal created
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {proposal.createdAt}
                    </p>
                  </div>

                  {proposal.status !==
                    "Draft" && (
                    <div className="relative">
                      <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-100">
                        <Send
                          size={13}
                          className="text-blue-600"
                        />
                      </div>

                      <p className="text-sm font-semibold text-slate-800">
                        Proposal sent to client
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Sent to {proposal.clientEmail}
                      </p>
                    </div>
                  )}

                  {(proposal.status ===
                    "Viewed" ||
                    proposal.status ===
                      "Accepted") && (
                    <div className="relative">
                      <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-purple-100">
                        <Eye
                          size={13}
                          className="text-purple-600"
                        />
                      </div>

                      <p className="text-sm font-semibold text-slate-800">
                        Proposal viewed
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Client has opened the proposal.
                      </p>
                    </div>
                  )}

                  {proposal.status ===
                    "Accepted" && (
                    <div className="relative">
                      <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-100">
                        <CheckCircle2
                          size={13}
                          className="text-emerald-600"
                        />
                      </div>

                      <p className="text-sm font-semibold text-slate-800">
                        Proposal accepted
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Client accepted the proposal.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Client */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Client
                </h2>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-sm font-bold text-purple-700">
                    {proposal.client
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {proposal.client}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {proposal.clientEmail}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/clients/${proposal.client === "Urban Threads" ? 1 : proposal.client === "Nova Studio" ? 2 : proposal.client === "GreenTech" ? 4 : proposal.client === "Acme Technologies" ? 3 : 5}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  View Client
                  <ArrowRight size={14} />
                </Link>
              </section>

              {/* Actions */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Actions
                </h2>

                <div className="mt-4 space-y-2">
                  {proposal.status === "Draft" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus("Sent")
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Send size={15} />
                      Send Proposal
                    </button>
                  )}

                  {proposal.status === "Sent" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus("Viewed")
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700"
                    >
                      <Eye size={15} />
                      Mark as Viewed
                    </button>
                  )}

                  {(proposal.status === "Sent" ||
                    proposal.status === "Viewed") && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus("Accepted")
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 size={15} />
                        Accept Proposal
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateStatus("Rejected")
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={15} />
                        Reject Proposal
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 size={15} />
                    Edit Proposal
                  </button>

                  <a
                    href={`mailto:${proposal.clientEmail}?subject=${encodeURIComponent(
                      proposal.title,
                    )}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Mail size={15} />
                    Email Client
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                    Delete Proposal
                  </button>
                </div>
              </section>

              {/* Value */}
              <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
                <p className="text-xs text-slate-400">
                  Proposal Value
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {money(proposal.value)}
                </p>

                <div className="mt-5 h-px bg-white/10" />

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Status
                  </span>

                  <span className="text-xs font-bold">
                    {proposal.status}
                  </span>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* Temporary edit dialog */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Proposal
              </h2>

              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Proposal Title
                </label>

                <input
                  value={proposal.title}
                  onChange={(event) =>
                    setProposal({
                      ...proposal,
                      title: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Description
                </label>

                <textarea
                  value={proposal.description ?? ""}
                  onChange={(event) =>
                    setProposal({
                      ...proposal,
                      description:
                        event.target.value,
                    })
                  }
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Value
                </label>

                <input
                  type="number"
                  value={proposal.value}
                  onChange={(event) =>
                    setProposal({
                      ...proposal,
                      value: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  showToast(
                    "Proposal updated successfully.",
                    "success",
                  );
                }}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
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
              Delete proposal?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {proposal.number}
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}