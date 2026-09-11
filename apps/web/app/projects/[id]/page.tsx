"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  FolderKanban,
  Mail,
  MoreHorizontal,
  Receipt,
  Rocket,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import EditProjectModal from "@/components/projects/EditProjectModal";
import {
  Project,
  ProjectStatus,
} from "@/components/projects/ProjectModal";
import { useToast } from "@/components/ui/ToastProvider";

const demoProjects: Project[] = [
  {
    id: 1,
    name: "E-commerce Website",
    client: "Urban Threads",
    clientEmail: "aarav@urbanthreads.com",
    description:
      "Complete e-commerce website design and development.",
    value: 120000,
    status: "Active",
    progress: 78,
    startDate: "2026-08-10",
    dueDate: "2026-10-15",
    createdAt: "2026-08-05",
  },
  {
    id: 2,
    name: "Brand Identity",
    client: "Nova Studio",
    clientEmail: "priya@novastudio.com",
    description:
      "Complete brand identity and visual design system.",
    value: 85000,
    status: "Active",
    progress: 52,
    startDate: "2026-08-20",
    dueDate: "2026-09-30",
    createdAt: "2026-08-18",
  },
  {
    id: 3,
    name: "Marketing Website",
    client: "GreenTech",
    clientEmail: "ananya@greentech.com",
    description:
      "Responsive marketing website for GreenTech.",
    value: 150000,
    status: "Active",
    progress: 64,
    startDate: "2026-08-15",
    dueDate: "2026-10-20",
    createdAt: "2026-08-12",
  },
  {
    id: 4,
    name: "Mobile App UI/UX",
    client: "Acme Technologies",
    clientEmail: "arjun@acme.com",
    description:
      "Complete mobile application UI/UX design.",
    value: 200000,
    status: "On Hold",
    progress: 35,
    startDate: "2026-07-25",
    dueDate: "2026-11-10",
    createdAt: "2026-07-20",
  },
  {
    id: 5,
    name: "Social Media Design",
    client: "Pixel Works",
    clientEmail: "vikram@pixelworks.com",
    description:
      "Monthly social media creative design package.",
    value: 65000,
    status: "Completed",
    progress: 100,
    startDate: "2026-07-01",
    dueDate: "2026-08-01",
    createdAt: "2026-06-28",
  },
];

const clientIds: Record<string, number> = {
  "Urban Threads": 1,
  "Nova Studio": 2,
  "Acme Technologies": 3,
  GreenTech: 4,
  "Pixel Works": 5,
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const id = Number(params.id);

  const foundProject = demoProjects.find(
    (project) => project.id === id,
  );

  const [project, setProject] =
    useState<Project | null>(
      foundProject ?? null,
    );

  const [editOpen, setEditOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  if (!project) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center p-6">
          <div className="text-center">
            <FolderKanban
              size={36}
              className="mx-auto text-slate-300"
            />

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Project not found
            </h1>

            <Link
              href="/projects"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft size={15} />
              Back to Projects
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const clientId =
    clientIds[project.client] ?? 1;

  const completedValue =
    (project.value * project.progress) / 100;

  const handleUpdate = (
    updatedProject: Project,
  ) => {
    setProject(updatedProject);
    setEditOpen(false);

    showToast(
      "Project updated successfully.",
      "success",
    );
  };

  const handleDelete = () => {
    setDeleteOpen(false);

    showToast(
      "Project deleted successfully.",
      "success",
    );

    router.push("/projects");
  };

  const handleStatusChange = (
    status: ProjectStatus,
  ) => {
    setProject({
      ...project,
      status,
      progress:
        status === "Completed"
          ? 100
          : project.progress,
    });

    showToast(
      `Project marked as ${status}.`,
      "success",
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Back */}
          <Link
            href="/projects"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={15} />
            Back to Projects
          </Link>

          {/* Hero */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/10">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <FolderKanban size={28} />
                  </div>

                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                        Project #{project.id}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                        {project.status}
                      </span>
                    </div>

                    <h1 className="text-2xl font-bold sm:text-3xl">
                      {project.name}
                    </h1>

                    <p className="mt-2 text-sm text-blue-100">
                      {project.client}
                    </p>
                  </div>
                </div>

                <div className="lg:text-right">
                  <p className="text-xs text-blue-100">
                    Project Value
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {money(project.value)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Progress */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Project Progress
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Track delivery progress against the project scope.
                </p>
              </div>

              <span className="text-2xl font-bold text-blue-600">
                {project.progress}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{
                  width: `${project.progress}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-[10px] text-slate-400">
              <span>Started</span>
              <span>Current progress</span>
              <span>Complete</span>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Main */}
            <div className="space-y-6">
              {/* Overview */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">
                    Project Overview
                  </h2>

                  <FolderKanban
                    size={18}
                    className="text-blue-500"
                  />
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-600">
                  {project.description}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <CalendarDays
                      size={17}
                      className="text-blue-600"
                    />

                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Start Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {project.startDate}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <CalendarDays
                      size={17}
                      className="text-orange-600"
                    />

                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Due Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {project.dueDate}
                    </p>
                  </div>
                </div>
              </section>

              {/* Project areas */}
              <section className="grid gap-4 sm:grid-cols-3">
                <Link
                  href="/tasks"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                    <CheckCircle2
                      size={19}
                      className="text-purple-600"
                    />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-900">
                    Tasks
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Manage project tasks
                  </p>

                  <ArrowRight
                    size={15}
                    className="mt-4 text-purple-500 transition group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/time"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Clock3
                      size={19}
                      className="text-blue-600"
                    />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-900">
                    Time Tracking
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Track project hours
                  </p>

                  <ArrowRight
                    size={15}
                    className="mt-4 text-blue-500 transition group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/files"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
                    <FileText
                      size={19}
                      className="text-orange-600"
                    />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-900">
                    Files
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Project documents
                  </p>

                  <ArrowRight
                    size={15}
                    className="mt-4 text-orange-500 transition group-hover:translate-x-1"
                  />
                </Link>
              </section>

              {/* Activity */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Project Activity
                </h2>

                <div className="relative mt-6 space-y-6 pl-8">
                  <div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200" />

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-100">
                      <FolderKanban
                        size={13}
                        className="text-blue-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Project created
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {project.createdAt}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-purple-100">
                      <Users
                        size={13}
                        className="text-purple-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Client assigned
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {project.client} is associated with this project.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-100">
                      <CheckCircle2
                        size={13}
                        className="text-emerald-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-slate-800">
                      Progress updated
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Project is currently {project.progress}% complete.
                    </p>
                  </div>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                    {project.client
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {project.client}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {project.clientEmail}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/clients/${clientId}`}
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  View Client
                  <ArrowRight size={14} />
                </Link>
              </section>

              {/* Finance */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Project Finance
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Contract value
                    </span>

                    <span className="text-sm font-bold text-slate-900">
                      {money(project.value)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Work completed
                    </span>

                    <span className="text-sm font-bold text-emerald-600">
                      {money(completedValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Remaining
                    </span>

                    <span className="text-sm font-bold text-orange-600">
                      {money(
                        project.value -
                          completedValue,
                      )}
                    </span>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Actions
                </h2>

                <div className="mt-4 space-y-2">
                  {project.status !==
                    "Completed" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          "Completed",
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={15} />
                      Mark Completed
                    </button>
                  )}

                  {project.status ===
                    "Active" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          "On Hold",
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50"
                    >
                      <Clock3 size={15} />
                      Put On Hold
                    </button>
                  )}

                  {project.status ===
                    "On Hold" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          "Active",
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Rocket size={15} />
                      Resume Project
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 size={15} />
                    Edit Project
                  </button>

                  <a
                    href={`mailto:${project.clientEmail}?subject=${encodeURIComponent(
                      project.name,
                    )}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Mail size={15} />
                    Email Client
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteOpen(true)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                    Delete Project
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* Existing edit modal */}
      {editOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setEditOpen(false)}
          onSave={handleUpdate}
        />
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
              Delete project?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {project.name}
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteOpen(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}