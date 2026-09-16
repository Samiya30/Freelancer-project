"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ApiProject,
  ProjectStatus,
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/lib/api/projects";
import {
  getClients,
  ApiClient,
} from "@/lib/api/clients";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Plus,
  Search,
  BriefcaseBusiness,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Eye,
  CalendarDays,
  IndianRupee,
  Users,
  CheckCircle2,
  Clock3,
  PauseCircle,
  X,
  ArrowRight,
  FolderKanban,
  Target,
} from "lucide-react";

const statusOptions: ProjectStatus[] = [
  "Planning",
  "InProgress",
  "Review",
  "Completed",
  "OnHold",
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  if (!value) return "-";

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

function toIsoDate(value: string) {
  if (!value) return undefined;

  return new Date(
    `${value}T00:00:00.000Z`,
  ).toISOString();
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
  status: ProjectStatus,
) {
  switch (status) {
    case "Planning":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "InProgress":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Review":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "OnHold":
      return "bg-orange-50 text-orange-700 border-orange-200";
  }
}

function getStatusIcon(
  status: ProjectStatus,
) {
  switch (status) {
    case "Planning":
      return (
        <Target className="h-3.5 w-3.5" />
      );

    case "InProgress":
      return (
        <Clock3 className="h-3.5 w-3.5" />
      );

    case "Review":
      return (
        <Eye className="h-3.5 w-3.5" />
      );

    case "Completed":
      return (
        <CheckCircle2 className="h-3.5 w-3.5" />
      );

    case "OnHold":
      return (
        <PauseCircle className="h-3.5 w-3.5" />
      );
  }
}

export default function ProjectsPage() {
  const { showToast } =
    useToast();

  const { hasPermission } =
    useAuth();

  /*
   * Frontend RBAC.
   *
   * The backend independently enforces
   * the same permissions.
   */
  const canCreate =
    hasPermission(
      "projects.create",
    );

  const canUpdate =
    hasPermission(
      "projects.update",
    );

  const canDelete =
    hasPermission(
      "projects.delete",
    );

  const [projects, setProjects] =
    useState<ApiProject[]>([]);

  const [clients, setClients] =
    useState<ApiClient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "All" | ProjectStatus
  >("All");

  const [addOpen, setAddOpen] =
    useState(false);

  const [menuId, setMenuId] =
    useState<number | null>(
      null,
    );

  const [deleteId, setDeleteId] =
    useState<number | null>(
      null,
    );

  const [newProject, setNewProject] =
    useState({
      name: "",
      client: "",
      clientEmail: "",
      description: "",
      status:
        "Planning" as ProjectStatus,
      startDate: "",
      dueDate: "",
      budget: "",
      progress: "0",
    });

  /*
   * Load data.
   */
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [
          projectsResponse,
          clientsResponse,
        ] = await Promise.all([
          getProjects(),
          getClients(),
        ]);

        if (!mounted) return;

        setProjects(
          projectsResponse.data ?? [],
        );

        setClients(
          clientsResponse.data ?? [],
        );
      } catch (error) {
        console.error(
          "Failed to load projects:",
          error,
        );

        if (mounted) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load projects.",
            "error",
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

  /*
   * Search + filter.
   */
  const filteredProjects =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return projects.filter(
        (project) => {
          const matchesSearch =
            !query ||
            project.name
              .toLowerCase()
              .includes(query) ||
            project.client
              .toLowerCase()
              .includes(query) ||
            project.description
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              "All" ||
            project.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      projects,
      search,
      statusFilter,
    ]);

  /*
   * Stats.
   */
  const activeProjects =
    projects.filter(
      (project) =>
        project.status ===
          "InProgress" ||
        project.status ===
          "Review",
    ).length;

  const completedProjects =
    projects.filter(
      (project) =>
        project.status ===
        "Completed",
    ).length;

  const totalBudget =
    projects.reduce(
      (sum, project) =>
        sum + project.budget,
      0,
    );

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce(
            (sum, project) =>
              sum +
              project.progress,
            0,
          ) / projects.length,
        )
      : 0;

  const resetForm = () => {
    setNewProject({
      name: "",
      client: "",
      clientEmail: "",
      description: "",
      status: "Planning",
      startDate: "",
      dueDate: "",
      budget: "",
      progress: "0",
    });
  };

  /*
   * CREATE PROJECT
   */
  const handleAddProject =
    async () => {
      if (!canCreate) {
        showToast(
          "You do not have permission to create projects.",
          "error",
        );
        return;
      }

      if (
        !newProject.name.trim() ||
        !newProject.client.trim() ||
        !newProject.clientEmail.trim() ||
        !newProject.startDate ||
        !newProject.dueDate ||
        !newProject.budget
      ) {
        showToast(
          "Please fill in all required fields.",
          "error",
        );
        return;
      }

      const budget =
        Number(
          newProject.budget,
        );

      if (
        !Number.isFinite(
          budget,
        ) ||
        budget < 0
      ) {
        showToast(
          "Please enter a valid budget.",
          "error",
        );
        return;
      }

      const progress = Math.min(
        100,
        Math.max(
          0,
          Number(
            newProject.progress,
          ) || 0,
        ),
      );

      try {
        setSaving(true);

        const response =
          await createProject({
            name:
              newProject.name.trim(),

            client:
              newProject.client.trim(),

            clientEmail:
              newProject.clientEmail.trim(),

            description:
              newProject.description.trim(),

            status:
              newProject.status,

            startDate:
              toIsoDate(
                newProject.startDate,
              ),

            dueDate:
              toIsoDate(
                newProject.dueDate,
              ),

            budget,

            progress,
          });

        if (response.data) {
          setProjects(
            (current) => [
              response.data!,
              ...current,
            ],
          );
        }

        resetForm();
        setAddOpen(false);

        showToast(
          "Project created successfully.",
          "success",
        );
      } catch (error) {
        console.error(
          "Failed to create project:",
          error,
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to create project.",
          "error",
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * UPDATE STATUS
   */
  const handleStatusChange =
    async (
      project: ApiProject,
      status: ProjectStatus,
    ) => {
      if (!canUpdate) {
        showToast(
          "You do not have permission to update projects.",
          "error",
        );
        return;
      }

      const previous = {
        ...project,
      };

      const updatedProgress =
        status === "Completed"
          ? 100
          : status === "Planning"
            ? Math.min(
                project.progress,
                10,
              )
            : project.progress;

      setProjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              project.id
                ? {
                    ...item,
                    status,
                    progress:
                      updatedProgress,
                  }
                : item,
          ),
      );

      try {
        const response =
          await updateProject(
            project.id,
            {
              status,
              progress:
                updatedProgress,
            },
          );

        if (response.data) {
          setProjects(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  project.id
                    ? response.data!
                    : item,
              ),
          );
        }

        showToast(
          `${project.name} moved to ${status}.`,
          "success",
        );
      } catch (error) {
        setProjects(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                project.id
                  ? previous
                  : item,
            ),
        );

        console.error(
          "Failed to update project:",
          error,
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to update project.",
          "error",
        );
      }
    };

  /*
   * UPDATE PROGRESS
   */
  const handleProgressChange =
    async (
      project: ApiProject,
      progress: number,
    ) => {
      if (!canUpdate) {
        showToast(
          "You do not have permission to update projects.",
          "error",
        );
        return;
      }

      const previous = {
        ...project,
      };

      const updatedStatus: ProjectStatus =
        progress === 100
          ? "Completed"
          : progress > 0 &&
              project.status ===
                "Planning"
            ? "InProgress"
            : project.status;

      setProjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              project.id
                ? {
                    ...item,
                    progress,
                    status:
                      updatedStatus,
                  }
                : item,
          ),
      );

      try {
        const response =
          await updateProject(
            project.id,
            {
              progress,
              status:
                updatedStatus,
            },
          );

        if (response.data) {
          setProjects(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  project.id
                    ? response.data!
                    : item,
              ),
          );
        }
      } catch (error) {
        setProjects(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                project.id
                  ? previous
                  : item,
            ),
        );

        console.error(
          "Failed to update progress:",
          error,
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to update progress.",
          "error",
        );
      }
    };

  /*
   * DUPLICATE
   *
   * Duplicate creates a new project,
   * so it requires projects.create.
   */
  const handleDuplicate =
    async (
      project: ApiProject,
    ) => {
      if (!canCreate) {
        showToast(
          "You do not have permission to create projects.",
          "error",
        );
        return;
      }

      try {
        setSaving(true);

        const response =
          await createProject({
            name: `${project.name} - Copy`,

            client:
              project.client,

            clientEmail:
              project.clientEmail,

            description:
              project.description,

            status: "Planning",

            startDate:
              project.startDate,

            dueDate:
              project.dueDate,

            budget:
              project.budget,

            progress: 0,
          });

        if (response.data) {
          setProjects(
            (current) => [
              response.data!,
              ...current,
            ],
          );
        }

        setMenuId(null);

        showToast(
          "Project duplicated successfully.",
          "success",
        );
      } catch (error) {
        console.error(
          "Failed to duplicate project:",
          error,
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to duplicate project.",
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
          "You do not have permission to delete projects.",
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

      try {
        setSaving(true);

        await deleteProject(id);

        setProjects(
          (current) =>
            current.filter(
              (project) =>
                project.id !== id,
            ),
        );

        setDeleteId(null);
        setMenuId(null);

        showToast(
          "Project deleted successfully.",
          "success",
        );
      } catch (error) {
        console.error(
          "Failed to delete project:",
          error,
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to delete project.",
          "error",
        );
      } finally {
        setSaving(false);
      }
    };

  const handleClientSelect =
    (
      clientName: string,
    ) => {
      const selectedClient =
        clients.find(
          (client) =>
            client.name ===
            clientName,
        );

      setNewProject({
        ...newProject,
        client:
          clientName,
        clientEmail:
          selectedClient?.email ??
          "",
      });
    };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30">

        {/* HEADER */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Project Management
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Projects
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Plan, track and deliver your freelance projects.
                </p>

              </div>

              {canCreate && (
                <button
                  type="button"
                  onClick={() =>
                    setAddOpen(
                      true,
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
              )}

            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* STATS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Total Projects
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {projects.length}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    Across your workspace
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Active Projects
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {activeProjects}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Currently in progress
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <Clock3 className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Completed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {completedProjects}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Successfully delivered
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-pink-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">

                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Portfolio Value
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-950">
                    {formatCurrency(
                      totalBudget,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-orange-600">
                    Avg.{" "}
                    {averageProgress}%
                    progress
                  </p>
                </div>

                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                  <IndianRupee className="h-5 w-5" />
                </div>

              </div>
            </div>

          </div>

          {/* SEARCH */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 lg:flex-row">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value,
                    )
                  }
                  placeholder="Search projects or clients..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />

              </div>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target
                      .value as
                      | "All"
                      | ProjectStatus,
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="All">
                  All Statuses
                </option>

                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>

            </div>
          </div>

          {/* PROJECT WORKSPACE */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-blue-50/50 px-5 py-5">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Project Workspace
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Monitor delivery, clients, budgets and deadlines.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {filteredProjects.length}{" "}
                  projects
                </div>

              </div>

            </div>

            {/* DESKTOP */}
            <div className="hidden lg:block">

              {loading ? (
                <div className="p-14 text-center">

                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    Loading projects...
                  </p>

                </div>
              ) : (
                <>
                  {filteredProjects.map(
                    (project) => (
                      <div
                        key={
                          project.id
                        }
                        className="group border-b border-slate-100 p-5 transition hover:bg-violet-50/20"
                      >

                        <div className="flex items-center gap-5">

                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 shadow-sm">
                            <BriefcaseBusiness className="h-6 w-6" />
                          </div>

                          <div className="min-w-[240px] flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                                  project.status,
                                )}`}
                              >
                                {getStatusIcon(
                                  project.status,
                                )}
                                {
                                  project.status
                                }
                              </span>

                            </div>

                            <h3 className="mt-2 truncate text-sm font-bold text-slate-900">
                              {
                                project.name
                              }
                            </h3>

                            <p className="mt-1 max-w-md truncate text-xs text-slate-400">
                              {
                                project.description ||
                                "No project description"
                              }
                            </p>

                          </div>

                          <div className="min-w-[190px]">

                            <div className="flex items-center gap-3">

                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                                  project.client,
                                )} text-[10px] font-bold text-white`}
                              >
                                {getInitials(
                                  project.client,
                                )}
                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-xs font-bold text-slate-800">
                                  {
                                    project.client
                                  }
                                </p>

                                <p className="truncate text-[11px] text-slate-400">
                                  {
                                    project.clientEmail
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                          <div className="min-w-[170px]">

                            <div className="mb-2 flex items-center justify-between">

                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Progress
                              </span>

                              <span className="text-xs font-bold text-slate-700">
                                {
                                  project.progress
                                }%
                              </span>

                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                                style={{
                                  width: `${project.progress}%`,
                                }}
                              />

                            </div>

                          </div>

                          <div className="min-w-[120px]">

                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Budget
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {formatCurrency(
                                project.budget,
                              )}
                            </p>

                          </div>

                          <div className="hidden min-w-[140px] xl:block">

                            <div className="flex items-center gap-2">

                              <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                                <CalendarDays className="h-4 w-4" />
                              </div>

                              <div>

                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Deadline
                                </p>

                                <p className="text-xs font-bold text-slate-700">
                                  {formatDate(
                                    project.dueDate,
                                  )}
                                </p>

                              </div>

                            </div>

                          </div>

                          {(canCreate ||
                            canUpdate ||
                            canDelete) && (
                            <div className="relative shrink-0">

                              <button
                                type="button"
                                onClick={() =>
                                  setMenuId(
                                    menuId ===
                                      project.id
                                      ? null
                                      : project.id,
                                  )
                                }
                                className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {menuId ===
                                project.id && (
                                <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">

                                  <button
                                    type="button"
                                    onClick={() => {
                                      showToast(
                                        "Project details will be available next.",
                                        "info",
                                      );
                                      setMenuId(
                                        null,
                                      );
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Project
                                  </button>

                                  {canUpdate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        showToast(
                                          "Project editing will be connected next.",
                                          "info",
                                        );
                                        setMenuId(
                                          null,
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit Project
                                    </button>
                                  )}

                                  {canCreate && (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        handleDuplicate(
                                          project,
                                        )
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                                          project.id,
                                        );
                                        setMenuId(
                                          null,
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
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

                        <div className="ml-[74px] mt-4 flex items-center gap-4">

                          <div className="flex items-center gap-2">

                            <Users className="h-3.5 w-3.5 text-slate-400" />

                            <span className="text-[10px] font-semibold text-slate-500">
                              Client:{" "}
                              {
                                project.client
                              }
                            </span>

                          </div>

                          <div className="h-3 w-px bg-slate-200" />

                          <div className="flex items-center gap-2">

                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                            <span className="text-[10px] font-semibold text-slate-500">
                              {formatDate(
                                project.startDate,
                              )}{" "}
                              →{" "}
                              {formatDate(
                                project.dueDate,
                              )}
                            </span>

                          </div>

                          {canUpdate && (
                            <div className="ml-auto flex items-center gap-2">

                              <span className="text-[10px] font-semibold text-slate-400">
                                Status
                              </span>

                              <select
                                value={
                                  project.status
                                }
                                onChange={(
                                  e,
                                ) =>
                                  handleStatusChange(
                                    project,
                                    e.target
                                      .value as ProjectStatus,
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 outline-none focus:border-violet-400"
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

                            </div>
                          )}

                          {!canUpdate && (
                            <div className="ml-auto">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                                  project.status,
                                )}`}
                              >
                                {getStatusIcon(
                                  project.status,
                                )}
                                {
                                  project.status
                                }
                              </span>
                            </div>
                          )}

                        </div>

                      </div>
                    ),
                  )}

                  {filteredProjects.length ===
                    0 && (
                    <div className="p-14 text-center">

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
                        <FolderKanban className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No projects found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another search or create a new project.
                      </p>

                      {canCreate && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddOpen(
                              true,
                            )
                          }
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
                        >
                          <Plus className="h-4 w-4" />
                          Create Project
                        </button>
                      )}

                    </div>
                  )}

                </>
              )}

            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 lg:hidden">

              {loading ? (
                <div className="p-12 text-center">

                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Loading projects...
                  </p>

                </div>
              ) : (
                <>
                  {filteredProjects.map(
                    (project) => (
                      <div
                        key={
                          project.id
                        }
                        className="p-4"
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
                            <BriefcaseBusiness className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <div>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusStyle(
                                    project.status,
                                  )}`}
                                >
                                  {getStatusIcon(
                                    project.status,
                                  )}
                                  {
                                    project.status
                                  }
                                </span>

                                <h3 className="mt-2 text-sm font-bold text-slate-900">
                                  {
                                    project.name
                                  }
                                </h3>

                              </div>

                              {(canCreate ||
                                canUpdate ||
                                canDelete) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuId(
                                      menuId ===
                                        project.id
                                        ? null
                                        : project.id,
                                    )
                                  }
                                  className="rounded-lg p-1.5 text-slate-400"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              )}

                            </div>

                            <div className="mt-3 flex items-center gap-2">

                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(
                                  project.client,
                                )} text-[9px] font-bold text-white`}
                              >
                                {getInitials(
                                  project.client,
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-700">
                                {
                                  project.client
                                }
                              </p>

                            </div>

                          </div>

                        </div>

                        <div className="mt-4">

                          <div className="mb-2 flex items-center justify-between">

                            <span className="text-[10px] font-semibold uppercase text-slate-400">
                              Progress
                            </span>

                            <span className="text-xs font-bold text-slate-700">
                              {
                                project.progress
                              }%
                            </span>

                          </div>

                          {canUpdate ? (
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={
                                project.progress
                              }
                              onChange={(
                                e,
                              ) =>
                                handleProgressChange(
                                  project,
                                  Number(
                                    e.target
                                      .value,
                                  ),
                                )
                              }
                              className="w-full accent-violet-600"
                            />
                          ) : (
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                                style={{
                                  width: `${project.progress}%`,
                                }}
                              />
                            </div>
                          )}

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-xl bg-violet-50 p-3">

                            <p className="text-[10px] font-semibold uppercase text-violet-400">
                              Budget
                            </p>

                            <p className="mt-1 text-sm font-bold text-violet-900">
                              {formatCurrency(
                                project.budget,
                              )}
                            </p>

                          </div>

                          <div className="rounded-xl bg-orange-50 p-3">

                            <p className="text-[10px] font-semibold uppercase text-orange-400">
                              Deadline
                            </p>

                            <p className="mt-1 text-sm font-bold text-orange-900">
                              {formatDate(
                                project.dueDate,
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 flex items-center justify-between">

                          {canUpdate ? (
                            <select
                              value={
                                project.status
                              }
                              onChange={(
                                e,
                              ) =>
                                handleStatusChange(
                                  project,
                                  e.target
                                    .value as ProjectStatus,
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none ${getStatusStyle(
                                project.status,
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
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                                project.status,
                              )}`}
                            >
                              {getStatusIcon(
                                project.status,
                              )}
                              {
                                project.status
                              }
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              showToast(
                                "Project details will be available next.",
                                "info",
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            View
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>

                        </div>

                        {menuId ===
                          project.id && (
                          <div className="mt-3 flex flex-wrap gap-2">

                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => {
                                  showToast(
                                    "Project editing will be connected next.",
                                    "info",
                                  );
                                  setMenuId(
                                    null,
                                  );
                                }}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}

                            {canCreate && (
                              <button
                                type="button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  handleDuplicate(
                                    project,
                                  )
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
                                    project.id,
                                  );
                                  setMenuId(
                                    null,
                                  );
                                }}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600"
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

                  {filteredProjects.length ===
                    0 && (
                    <div className="p-12 text-center">

                      <FolderKanban className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No projects found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try another search or filter.
                      </p>

                    </div>
                  )}

                </>
              )}

            </div>

          </div>

          {/* WORKFLOW BANNER */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-5 text-white shadow-lg">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white/15 p-2.5">
                  <FolderKanban className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-sm font-bold">
                    Keep every project moving
                  </p>

                  <p className="mt-1 text-xs text-violet-100">
                    Connect projects with tasks, time tracking, invoices and client communication.
                  </p>

                </div>

              </div>

              <a
                href="/tasks"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-violet-100"
              >
                Manage Tasks
                <ArrowRight className="h-4 w-4" />
              </a>

            </div>

          </div>

        </main>

        {/* CREATE PROJECT MODAL */}
        {addOpen &&
          canCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

              <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

                <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-5 text-white">

                  <div className="flex items-center justify-between">

                    <div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                        <FolderKanban className="h-4 w-4" />
                        Project Management
                      </div>

                      <h2 className="mt-1 text-xl font-bold">
                        New Project
                      </h2>

                      <p className="mt-1 text-sm text-violet-100">
                        Set up a new client project.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAddOpen(
                          false,
                        )
                      }
                      className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                    >
                      <X className="h-5 w-5" />
                    </button>

                  </div>

                </div>

                <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="sm:col-span-2">

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Project Name *
                      </label>

                      <input
                        value={
                          newProject.name
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              name:
                                e.target
                                  .value,
                            },
                          )
                        }
                        placeholder="Website Redesign"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Client *
                      </label>

                      {clients.length >
                      0 ? (
                        <select
                          value={
                            newProject.client
                          }
                          onChange={(e) =>
                            handleClientSelect(
                              e.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                        >

                          <option value="">
                            Select client
                          </option>

                          {clients.map(
                            (client) => (
                              <option
                                key={
                                  client.id
                                }
                                value={
                                  client.name
                                }
                              >
                                {
                                  client.name
                                }
                              </option>
                            ),
                          )}

                        </select>
                      ) : (
                        <input
                          value={
                            newProject.client
                          }
                          onChange={(e) =>
                            setNewProject(
                              {
                                ...newProject,
                                client:
                                  e.target
                                    .value,
                              },
                            )
                          }
                          placeholder="Client name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                        />
                      )}

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Client Email *
                      </label>

                      <input
                        type="email"
                        value={
                          newProject.clientEmail
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              clientEmail:
                                e.target
                                  .value,
                            },
                          )
                        }
                        placeholder="client@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Budget *
                      </label>

                      <div className="relative">

                        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="number"
                          min="0"
                          value={
                            newProject.budget
                          }
                          onChange={(e) =>
                            setNewProject(
                              {
                                ...newProject,
                                budget:
                                  e.target
                                    .value,
                              },
                            )
                          }
                          placeholder="85000"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                        />

                      </div>

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Status
                      </label>

                      <select
                        value={
                          newProject.status
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              status:
                                e.target
                                  .value as ProjectStatus,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      >

                        {statusOptions.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          ),
                        )}

                      </select>

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Start Date *
                      </label>

                      <input
                        type="date"
                        value={
                          newProject.startDate
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              startDate:
                                e.target
                                  .value,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Due Date *
                      </label>

                      <input
                        type="date"
                        value={
                          newProject.dueDate
                        }
                        min={
                          newProject.startDate
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              dueDate:
                                e.target
                                  .value,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                    <div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Starting Progress
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          newProject.progress
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              progress:
                                e.target
                                  .value,
                            },
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                    <div className="sm:col-span-2">

                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Description
                      </label>

                      <textarea
                        rows={4}
                        value={
                          newProject.description
                        }
                        onChange={(e) =>
                          setNewProject(
                            {
                              ...newProject,
                              description:
                                e.target
                                  .value,
                            },
                          )
                        }
                        placeholder="Describe the project scope and goals..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />

                    </div>

                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                    <button
                      type="button"
                      onClick={() =>
                        setAddOpen(
                          false,
                        )
                      }
                      disabled={
                        saving
                      }
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        handleAddProject
                      }
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : "Create Project"}
                    </button>

                  </div>

                </div>

              </div>
            </div>
          )}

        {/* DELETE MODAL */}
        {deleteId !== null &&
          canDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Delete this project?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This project will be permanently removed from your workspace.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteId(
                        null,
                      )
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      handleDelete
                    }
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Deleting..."
                      : "Delete Project"}
                  </button>

                </div>

              </div>
            </div>
          )}

      </div>
    </AppShell>
  );
}