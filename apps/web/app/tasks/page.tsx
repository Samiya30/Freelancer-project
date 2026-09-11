"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ListTodo,
  CalendarDays,
  BriefcaseBusiness,
  Flag,
  X,
  ArrowRight,
  CircleDot,
  Timer,
} from "lucide-react";

import {
  ApiTask,
  TaskStatus as ApiTaskStatus,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "@/lib/api/tasks";

import {
  ApiProject,
  getProjects,
} from "@/lib/api/projects";

type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Review"
  | "Done";

type TaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

const statuses: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
];

const priorities: TaskPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

function toApiStatus(status: TaskStatus): ApiTaskStatus {
  switch (status) {
    case "To Do":
      return "ToDo";
    case "In Progress":
      return "InProgress";
    case "Review":
      return "Review";
    case "Done":
      return "Done";
  }
}

function fromApiStatus(status: ApiTaskStatus): TaskStatus {
  switch (status) {
    case "ToDo":
      return "To Do";
    case "InProgress":
      return "In Progress";
    case "Review":
      return "Review";
    case "Done":
      return "Done";
  }
}

function formatDate(date: string) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toIsoDate(date: string) {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function getPriorityStyle(priority: TaskPriority) {
  switch (priority) {
    case "Urgent":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case "To Do":
      return <CircleDot className="h-3.5 w-3.5" />;
    case "In Progress":
      return <Clock3 className="h-3.5 w-3.5" />;
    case "Review":
      return <Eye className="h-3.5 w-3.5" />;
    case "Done":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function getPriorityIcon(priority: TaskPriority) {
  return (
    <Flag
      className={`h-3.5 w-3.5 ${
        priority === "Urgent"
          ? "fill-rose-500 text-rose-500"
          : priority === "High"
          ? "fill-orange-500 text-orange-500"
          : priority === "Medium"
          ? "fill-amber-500 text-amber-500"
          : "text-slate-400"
      }`}
    />
  );
}

function getProjectGradient(project: string) {
  const gradients = [
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-pink-500",
    "from-indigo-500 to-purple-500",
  ];

  const index =
    project.split("").reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0
    ) % gradients.length;

  return gradients[index];
}

function isOverdue(task: ApiTask) {
  if (task.status === "Done") return false;

  const dueDate = new Date(task.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}

export default function TasksPage() {
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState<
    "All" | TaskPriority
  >("All");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    projectId: "",
    status: "To Do" as TaskStatus,
    priority: "Medium" as TaskPriority,
    dueDate: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [tasksResponse, projectsResponse] = await Promise.all([
          getTasks(),
          getProjects(),
        ]);

        if (!tasksResponse.success) {
          throw new Error(
            tasksResponse.message || "Failed to load tasks"
          );
        }

        if (!projectsResponse.success) {
          throw new Error(
            projectsResponse.message || "Failed to load projects"
          );
        }

        setTasks(tasksResponse.data ?? []);
        setProjects(projectsResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load tasks:", error);

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load tasks.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [showToast]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.projectName.toLowerCase().includes(query);

      const matchesProject =
        projectFilter === "All" ||
        task.projectName === projectFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      return matchesSearch && matchesProject && matchesPriority;
    });
  }, [tasks, search, projectFilter, priorityFilter]);

  const totalTasks = tasks.length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "InProgress"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  const overdueTasks = tasks.filter(isOverdue).length;

  const handleAddTask = async () => {
    if (
      !newTask.title.trim() ||
      !newTask.projectId ||
      !newTask.dueDate
    ) {
      showToast(
        "Please fill in all required fields.",
        "error"
      );
      return;
    }

    const selectedProject = projects.find(
      (project) =>
        project.id === Number(newTask.projectId)
    );

    if (!selectedProject) {
      showToast(
        "Please select a valid project.",
        "error"
      );
      return;
    }

    try {
      const response = await createTask({
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        projectId: selectedProject.id,
        status: toApiStatus(newTask.status),
        priority: newTask.priority,
        dueDate: toIsoDate(newTask.dueDate),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to create task."
        );
      }

      setTasks((current) => [
        response.data!,
        ...current,
      ]);

      setNewTask({
        title: "",
        description: "",
        projectId: "",
        status: "To Do",
        priority: "Medium",
        dueDate: "",
      });

      setAddOpen(false);

      showToast(
        "Task created successfully.",
        "success"
      );
    } catch (error) {
      console.error("Failed to create task:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create task.",
        "error"
      );
    }
  };

  const handleStatusChange = async (
    task: ApiTask,
    status: TaskStatus
  ) => {
    try {
      const response = await updateTask(task.id, {
        status: toApiStatus(status),
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to update task."
        );
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? response.data!
            : item
        )
      );

      showToast(
        `${task.title} moved to ${status}.`,
        "success"
      );
    } catch (error) {
      console.error("Failed to update task status:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update task.",
        "error"
      );
    }
  };

  const handlePriorityChange = async (
    task: ApiTask,
    priority: TaskPriority
  ) => {
    try {
      const response = await updateTask(task.id, {
        priority,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to update priority."
        );
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? response.data!
            : item
        )
      );

      showToast(
        `${task.title} priority updated.`,
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to update task priority:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update priority.",
        "error"
      );
    }
  };

  const handleDuplicate = async (task: ApiTask) => {
    try {
      const response = await createTask({
        title: `${task.title} - Copy`,
        description: task.description,
        projectId: task.projectId,
        status: "ToDo",
        priority: task.priority,
        dueDate: task.dueDate,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to duplicate task."
        );
      }

      setTasks((current) => [
        response.data!,
        ...current,
      ]);

      setMenuId(null);

      showToast(
        "Task duplicated successfully.",
        "success"
      );
    } catch (error) {
      console.error("Failed to duplicate task:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate task.",
        "error"
      );
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      const response = await deleteTask(deleteId);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to delete task."
        );
      }

      setTasks((current) =>
        current.filter(
          (task) => task.id !== deleteId
        )
      );

      setDeleteId(null);
      setMenuId(null);

      showToast(
        "Task deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error("Failed to delete task:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete task.",
        "error"
      );
    }
  };

  const moveTask = async (
    task: ApiTask,
    direction: "next" | "previous"
  ) => {
    const currentStatus = fromApiStatus(task.status);
    const currentIndex = statuses.indexOf(currentStatus);

    const nextIndex =
      direction === "next"
        ? Math.min(
            statuses.length - 1,
            currentIndex + 1
          )
        : Math.max(0, currentIndex - 1);

    if (nextIndex === currentIndex) return;

    await handleStatusChange(
      task,
      statuses[nextIndex]
    );
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <ListTodo className="h-3.5 w-3.5" />
                  Task Management
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Tasks
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Organize your work and keep every project moving.
                </p>
              </div>

              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Total Tasks
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {totalTasks}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    Across all projects
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <ListTodo className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    In Progress
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {inProgressTasks}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Currently being worked on
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
                    {completedTasks}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Successfully finished
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
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
                    {overdueTasks}
                  </p>

                  <p className="mt-1 text-xs text-rose-600">
                    Need your attention
                  </p>
                </div>

                <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search tasks, projects or descriptions..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <select
                value={projectFilter}
                onChange={(e) =>
                  setProjectFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">
                  All Projects
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

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value as
                      | "All"
                      | TaskPriority
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">
                  All Priorities
                </option>

                {priorities.map((priority) => (
                  <option
                    key={priority}
                    value={priority}
                  >
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid min-w-[1250px] grid-cols-4 gap-5 overflow-x-auto">
              {statuses.map((status) => (
                <div
                  key={status}
                  className="min-h-[520px] animate-pulse rounded-3xl border border-slate-200 bg-slate-100 p-3"
                >
                  <div className="mb-3 h-20 rounded-2xl bg-white" />
                  <div className="space-y-3">
                    <div className="h-48 rounded-2xl bg-white" />
                    <div className="h-48 rounded-2xl bg-white" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto pb-3">
              <div className="grid min-w-[1250px] grid-cols-4 gap-5">
                {statuses.map((status) => {
                  const columnTasks =
                    filteredTasks.filter(
                      (task) =>
                        fromApiStatus(task.status) ===
                        status
                    );

                  return (
                    <div
                      key={status}
                      className="min-h-[520px] rounded-3xl border border-slate-200 bg-slate-100/70 p-3"
                    >
                      <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`rounded-lg p-2 ${
                                status === "To Do"
                                  ? "bg-slate-100 text-slate-600"
                                  : status ===
                                    "In Progress"
                                  ? "bg-blue-100 text-blue-600"
                                  : status === "Review"
                                  ? "bg-violet-100 text-violet-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}
                            >
                              {getStatusIcon(status)}
                            </div>

                            <div>
                              <h2 className="text-sm font-bold text-slate-900">
                                {status}
                              </h2>

                              <p className="text-[10px] text-slate-400">
                                {columnTasks.length} tasks
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              setAddOpen(true)
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {columnTasks.map((task) => (
                          <div
                            key={task.id}
                            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityStyle(
                                  task.priority
                                )}`}
                              >
                                {getPriorityIcon(
                                  task.priority
                                )}
                                {task.priority}
                              </span>

                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setMenuId(
                                      menuId ===
                                        task.id
                                        ? null
                                        : task.id
                                    )
                                  }
                                  className="rounded-lg p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>

                                {menuId === task.id && (
                                  <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                                    <button
                                      onClick={() => {
                                        setMenuId(
                                          null
                                        );

                                        showToast(
                                          "Task details will be available next.",
                                          "info"
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      View Task
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDuplicate(
                                          task
                                        )
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      Duplicate
                                    </button>

                                    <button
                                      onClick={() => {
                                        setDeleteId(
                                          task.id
                                        );
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

                            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                              {task.title}
                            </h3>

                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                              {task.description ||
                                "No description added."}
                            </p>

                            <div className="mt-4 flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${getProjectGradient(
                                  task.projectName
                                )} text-white`}
                              >
                                <BriefcaseBusiness className="h-3.5 w-3.5" />
                              </div>

                              <span className="truncate text-[11px] font-semibold text-slate-600">
                                {task.projectName}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                              <div
                                className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                                  isOverdue(task)
                                    ? "text-rose-600"
                                    : "text-slate-400"
                                }`}
                              >
                                <CalendarDays className="h-3.5 w-3.5" />

                                {formatDate(
                                  task.dueDate
                                )}

                                {isOverdue(task) && (
                                  <span className="font-bold">
                                    Overdue
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {status !== "To Do" && (
                                  <button
                                    onClick={() =>
                                      moveTask(
                                        task,
                                        "previous"
                                      )
                                    }
                                    className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                                    title="Move back"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                                  </button>
                                )}

                                {status !== "Done" && (
                                  <button
                                    onClick={() =>
                                      moveTask(
                                        task,
                                        "next"
                                      )
                                    }
                                    className="rounded-lg p-1.5 text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                                    title="Move forward"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {columnTasks.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
                            <CircleDot className="mx-auto h-6 w-6 text-slate-300" />

                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              No tasks here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Timer className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Track the time behind every task
                  </p>

                  <p className="mt-1 text-xs text-blue-100">
                    Turn completed work into accurate billable hours.
                  </p>
                </div>
              </div>

              <a
                href="/time"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-100"
              >
                Start Time Tracking
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>

        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                      <ListTodo className="h-4 w-4" />
                      Task Management
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      New Task
                    </h2>

                    <p className="mt-1 text-sm text-blue-100">
                      Add a task to one of your active projects.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setAddOpen(false)
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
                      Task Title *
                    </label>

                    <input
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          title: e.target.value,
                        })
                      }
                      placeholder="Create homepage design"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project *
                    </label>

                    <select
                      value={newTask.projectId}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          projectId:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">
                        Select project
                      </option>

                      {projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Priority
                    </label>

                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          priority:
                            e.target.value as TaskPriority,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      {priorities.map(
                        (priority) => (
                          <option
                            key={priority}
                            value={priority}
                          >
                            {priority}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={newTask.status}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          status:
                            e.target.value as TaskStatus,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    >
                      {statuses.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Due Date *
                    </label>

                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          dueDate:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={4}
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          description:
                            e.target.value,
                        })
                      }
                      placeholder="Describe what needs to be completed..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() =>
                      setAddOpen(false)
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleAddTask}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:-translate-y-0.5"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Delete this task?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This task will be permanently removed from your workspace.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() =>
                    setDeleteId(null)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}