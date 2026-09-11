"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  FolderKanban,
  ListTodo,
  Mail,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import {
  Task,
  TaskPriority,
  TaskStatus,
} from "@/components/tasks/TaskModal";
import { useToast } from "@/components/ui/ToastProvider";

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Design landing page",
    description:
      "Create the main landing page design for the client website.",
    projectId: 1,
    projectName: "Nova Website",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-09-08",
    createdAt: "2026-09-01",
  },
  {
    id: 2,
    title: "Prepare project proposal",
    description:
      "Finalize proposal and send it to the client.",
    projectId: 2,
    projectName: "Brand Refresh",
    status: "To Do",
    priority: "Urgent",
    dueDate: "2026-09-07",
    createdAt: "2026-09-02",
  },
  {
    id: 3,
    title: "API integration",
    description:
      "Connect frontend forms with the project API.",
    projectId: 1,
    projectName: "Nova Website",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-09-12",
    createdAt: "2026-09-02",
  },
  {
    id: 4,
    title: "Mobile responsive testing",
    description:
      "Test all major pages on mobile and tablet breakpoints.",
    projectId: 3,
    projectName: "Mobile App UI",
    status: "Review",
    priority: "Medium",
    dueDate: "2026-09-09",
    createdAt: "2026-09-03",
  },
  {
    id: 5,
    title: "Client feedback changes",
    description:
      "Apply the latest feedback received from the client.",
    projectId: 2,
    projectName: "Brand Refresh",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-09-11",
    createdAt: "2026-09-04",
  },
  {
    id: 6,
    title: "Deploy production build",
    description:
      "Deploy the completed project to production.",
    projectId: 3,
    projectName: "Mobile App UI",
    status: "Done",
    priority: "High",
    dueDate: "2026-09-05",
    createdAt: "2026-08-28",
  },
  {
    id: 7,
    title: "Update documentation",
    description:
      "Update setup and usage documentation.",
    projectId: 4,
    projectName: "FreelanceOS",
    status: "Done",
    priority: "Low",
    dueDate: "2026-09-04",
    createdAt: "2026-08-27",
  },
];

const projects = [
  { id: 1, name: "Nova Website" },
  { id: 2, name: "Brand Refresh" },
  { id: 3, name: "Mobile App UI" },
  { id: 4, name: "FreelanceOS" },
];

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

const statusColors: Record<TaskStatus, string> = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Review: "bg-amber-100 text-amber-700",
  Done: "bg-emerald-100 text-emerald-700",
};

const priorityColors: Record<TaskPriority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function isOverdue(task: Task) {
  if (task.status === "Done") {
    return false;
  }

  return new Date(`${task.dueDate}T23:59:59`) < new Date();
}

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const taskId = Number(params.id);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const task = useMemo(
    () => tasks.find((item) => item.id === taskId),
    [tasks, taskId]
  );

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] =
    useState("");
  const [editStatus, setEditStatus] =
    useState<TaskStatus>("To Do");
  const [editPriority, setEditPriority] =
    useState<TaskPriority>("Medium");
  const [editProject, setEditProject] = useState(1);
  const [editDueDate, setEditDueDate] = useState("");

  const openEdit = () => {
    if (!task) return;

    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditProject(task.projectId);
    setEditDueDate(task.dueDate);
    setEditing(true);
  };

  if (!task) {
    return (
      <AppShell>
        <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ListTodo className="h-6 w-6" />
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Task not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This task may have been deleted or does not exist.
            </p>

            <Link
              href="/tasks"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tasks
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const overdue = isOverdue(task);

  const saveChanges = () => {
    if (!editTitle.trim()) {
      showToast("Please enter a task title.");
      return;
    }

    if (!editDueDate) {
      showToast("Please select a due date.");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === editProject
    );

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              title: editTitle.trim(),
              description: editDescription.trim(),
              status: editStatus,
              priority: editPriority,
              projectId: editProject,
              projectName:
                selectedProject?.name ?? item.projectName,
              dueDate: editDueDate,
            }
          : item
      )
    );

    setEditing(false);
    showToast("Your task changes have been saved.");
  };

  const updateStatus = (status: TaskStatus) => {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, status }
          : item
      )
    );

    setEditStatus(status);
    showToast(`Task is now ${status}.`);
  };

  const updatePriority = (priority: TaskPriority) => {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, priority }
          : item
      )
    );

    setEditPriority(priority);
    showToast(`Priority changed to ${priority}.`);
  };

  const deleteTask = () => {
    setTasks((current) =>
      current.filter((item) => item.id !== task.id)
    );

    showToast(`"${task.title}" was deleted.`);
    router.push("/tasks");
  };

  const markComplete = () => {
    updateStatus("Done");
  };

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {/* Back */}
          <Link
            href="/tasks"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Link>

          {/* Hero */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                      Task #{task.id}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[task.status]}`}
                    >
                      {task.status}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${priorityColors[task.priority]}`}
                    >
                      {task.priority} priority
                    </span>
                  </div>

                  <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {task.title}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                    {task.description}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      {task.projectName}
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Due {formatDate(task.dueDate)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                  {task.status !== "Done" && (
                    <button
                      onClick={markComplete}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                    >
                      <Check className="h-4 w-4" />
                      Complete
                    </button>
                  )}

                  <button
                    onClick={openEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              {/* Progress */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Task progress
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Move the task through your workflow.
                    </p>
                  </div>

                  <Zap className="h-5 w-5 text-blue-500" />
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  {statuses.map((status) => {
                    const active = task.status === status;

                    const done =
                      statuses.indexOf(status) <
                      statuses.indexOf(task.status);

                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(status)}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <CircleIcon status={status} />
                          )}

                          <span className="text-xs font-bold">
                            {status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Overview */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                    <ListTodo className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Task overview
                    </h2>

                    <p className="text-sm text-slate-500">
                      Important details about this task.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={
                      <FolderKanban className="h-4 w-4" />
                    }
                    label="Project"
                    value={task.projectName}
                  />

                  <InfoCard
                    icon={
                      <CalendarDays className="h-4 w-4" />
                    }
                    label="Due date"
                    value={formatDate(task.dueDate)}
                    danger={overdue}
                  />

                  <InfoCard
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Created"
                    value={formatDate(task.createdAt)}
                  />

                  <InfoCard
                    icon={
                      <AlertCircle className="h-4 w-4" />
                    }
                    label="Priority"
                    value={task.priority}
                  />
                </div>

                {overdue && (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>
                      <p className="text-sm font-bold text-red-800">
                        This task is overdue
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        The due date has passed. Consider updating
                        the deadline or completing the task.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Activity */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <h2 className="font-bold text-slate-900">
                    Activity
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Recent activity for this task.
                  </p>
                </div>

                <div className="space-y-6">
                  <Activity
                    icon={<Edit3 className="h-4 w-4" />}
                    title="Task created"
                    description="The task was added to the project."
                    date={formatDate(task.createdAt)}
                  />

                  {task.status !== "To Do" && (
                    <Activity
                      icon={<Clock3 className="h-4 w-4" />}
                      title={`Moved to ${task.status}`}
                      description="Task workflow status was updated."
                      date="Recently"
                    />
                  )}

                  {task.status === "Done" && (
                    <Activity
                      icon={
                        <CheckCircle2 className="h-4 w-4" />
                      }
                      title="Task completed"
                      description="The task was marked as completed."
                      date="Recently"
                    />
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Project */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700">
                    {task.projectName
                      .split(" ")
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join("")}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">
                      Project
                    </p>

                    <h3 className="truncate font-bold text-slate-900">
                      {task.projectName}
                    </h3>
                  </div>
                </div>

                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View project
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>

              {/* Assignment */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">
                  Assignment
                </h3>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                    S
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Sonam
                    </p>

                    <p className="text-xs text-slate-500">
                      Project owner
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    showToast(
                      "Team assignment will be connected to the backend."
                    )
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <UserRound className="h-4 w-4" />
                  Change assignee
                </button>
              </section>

              {/* Quick actions */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">
                  Quick actions
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={() =>
                      showToast(
                        "Email integration will be connected later."
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email client
                  </button>

                  <Link
                    href="/time"
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Clock3 className="h-4 w-4 text-indigo-500" />
                    Track time
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Edit task
                  </h2>

                  <p className="text-xs text-slate-500">
                    Update task details and workflow.
                  </p>
                </div>

                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Task title
                  </label>

                  <input
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as TaskStatus
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Priority
                    </label>

                    <select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(
                          event.target.value as TaskPriority
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Project
                    </label>

                    <select
                      value={editProject}
                      onChange={(event) =>
                        setEditProject(
                          Number(event.target.value)
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    >
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
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Due date
                    </label>

                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(event) =>
                        setEditDueDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={saveChanges}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Delete this task?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This will permanently remove{" "}
                <span className="font-semibold text-slate-700">
                  “{task.title}”
                </span>{" "}
                from your workspace.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteTask}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CircleIcon({ status }: { status: TaskStatus }) {
  if (status === "In Progress") {
    return <Clock3 className="h-4 w-4" />;
  }

  if (status === "Review") {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <Circle className="h-4 w-4" />;
}

function InfoCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p
        className={`text-sm font-bold ${
          danger ? "text-red-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Activity({
  icon,
  title,
  description,
  date,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  date: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col justify-between gap-1 sm:flex-row">
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <span className="text-xs text-slate-400">
            {date}
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}