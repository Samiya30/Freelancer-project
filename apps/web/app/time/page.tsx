"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  TimeEntry,
  useFreelanceStore,
} from "@/lib/store/FreelanceStore";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Plus,
  Search,
  Play,
  Pause,
  Square,
  Clock3,
  Timer,
  IndianRupee,
  BriefcaseBusiness,
  CalendarDays,
  MoreHorizontal,
  Trash2,
  Copy,
  X,
  CheckCircle2,
  TrendingUp,
  Zap,
  Receipt,
} from "lucide-react";

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
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
    project.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    gradients.length;

  return gradients[index];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TimePage() {
  const {
    timeEntries,
    projects,
    tasks,
    addTimeEntry,
    deleteTimeEntry,
  } = useFreelanceStore();

  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const [newEntry, setNewEntry] = useState({
    description: "",
    projectId: "",
    taskId: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    minutes: "",
    billable: true,
    hourlyRate: "1500",
  });

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimerSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return timeEntries.filter((entry) => {
      const matchesSearch =
        !query ||
        entry.description.toLowerCase().includes(query) ||
        entry.projectName.toLowerCase().includes(query) ||
        entry.taskName?.toLowerCase().includes(query);

      const matchesProject =
        projectFilter === "All" ||
        entry.projectName === projectFilter;

      const matchesDate =
        !dateFilter || entry.date === dateFilter;

      return matchesSearch && matchesProject && matchesDate;
    });
  }, [timeEntries, search, projectFilter, dateFilter]);

  const totalMinutes = timeEntries.reduce(
    (sum, entry) => sum + entry.duration,
    0
  );

  const billableMinutes = timeEntries
    .filter((entry) => entry.billable)
    .reduce((sum, entry) => sum + entry.duration, 0);

  const totalValue = timeEntries
    .filter((entry) => entry.billable)
    .reduce(
      (sum, entry) =>
        sum + (entry.duration / 60) * entry.hourlyRate,
      0
    );

  const billableRate =
    totalMinutes > 0
      ? Math.round((billableMinutes / totalMinutes) * 100)
      : 0;

  const selectedProjectTasks = tasks.filter(
    (task) => task.projectId === Number(newEntry.projectId)
  );

  const handleStartTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      showToast("Timer paused.", "info");
      return;
    }

    setTimerRunning(true);
    showToast("Timer started.", "success");
  };

  const handleStopTimer = () => {
    if (timerSeconds === 0) {
      setTimerRunning(false);
      return;
    }

    const selectedProject =
      projects.find((project) => project.id === Number(newEntry.projectId)) ||
      projects[0];

    if (!selectedProject) {
      showToast("Create a project before starting a timer.", "error");
      setTimerRunning(false);
      return;
    }

    const duration = Math.max(
      1,
      Math.round(timerSeconds / 60)
    );

    const entry: TimeEntry = {
      id: Date.now(),
      description:
        newEntry.description.trim() || "Tracked work session",
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      taskId: newEntry.taskId
        ? Number(newEntry.taskId)
        : undefined,
      taskName: newEntry.taskId
        ? tasks.find(
            (task) => task.id === Number(newEntry.taskId)
          )?.title
        : undefined,
      date: new Date().toISOString().split("T")[0],
      duration,
      billable: true,
      hourlyRate: Number(newEntry.hourlyRate) || 1500,
    };

    addTimeEntry(entry);

    setTimerSeconds(0);
    setTimerRunning(false);

    showToast(
      `${formatDuration(duration)} saved to ${selectedProject.name}.`,
      "success"
    );
  };

  const handleAddEntry = () => {
    if (
      !newEntry.description.trim() ||
      !newEntry.projectId ||
      !newEntry.date
    ) {
      showToast("Please fill in the required fields.", "error");
      return;
    }

    const hours = Number(newEntry.hours) || 0;
    const minutes = Number(newEntry.minutes) || 0;
    const duration = hours * 60 + minutes;

    if (duration <= 0) {
      showToast("Enter a valid duration.", "error");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === Number(newEntry.projectId)
    );

    if (!selectedProject) {
      showToast("Please select a valid project.", "error");
      return;
    }

    const selectedTask = newEntry.taskId
      ? tasks.find(
          (task) => task.id === Number(newEntry.taskId)
        )
      : undefined;

    const entry: TimeEntry = {
      id: Date.now(),
      description: newEntry.description.trim(),
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      taskId: selectedTask?.id,
      taskName: selectedTask?.title,
      date: newEntry.date,
      duration,
      billable: newEntry.billable,
      hourlyRate: Number(newEntry.hourlyRate) || 1500,
    };

    addTimeEntry(entry);

    setNewEntry({
      description: "",
      projectId: "",
      taskId: "",
      date: new Date().toISOString().split("T")[0],
      hours: "",
      minutes: "",
      billable: true,
      hourlyRate: "1500",
    });

    setAddOpen(false);

    showToast("Time entry added successfully.", "success");
  };

  const handleDuplicate = (entry: TimeEntry) => {
    const duplicate: TimeEntry = {
      ...entry,
      id: Date.now(),
      description: `${entry.description} - Copy`,
    };

    addTimeEntry(duplicate);
    setMenuId(null);

    showToast("Time entry duplicated.", "success");
  };

  const handleDelete = () => {
    if (deleteId === null) return;

    deleteTimeEntry(deleteId);
    setDeleteId(null);
    setMenuId(null);

    showToast("Time entry deleted.", "success");
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Timer className="h-3.5 w-3.5" />
                  Time Tracking
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Time
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Track your work, calculate billable hours and stay
                  profitable.
                </p>
              </div>

              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                Add Time
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Timer */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 p-5 text-white shadow-xl sm:p-7">
            <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                  <Zap className="h-3.5 w-3.5" />
                  Live Time Tracker
                </div>

                <h2 className="mt-4 text-xl font-bold sm:text-2xl">
                  Track your current work session
                </h2>

                <p className="mt-1 max-w-xl text-sm text-slate-300">
                  Start the timer while working and save the session
                  directly to your project.
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-center backdrop-blur">
                  <p className="font-mono text-4xl font-bold tracking-wider sm:text-5xl">
                    {formatTimer(timerSeconds)}
                  </p>

                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    Current Session
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartTimer}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-900 shadow-lg transition hover:scale-105"
                    title={timerRunning ? "Pause timer" : "Start timer"}
                  >
                    {timerRunning ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 fill-current" />
                    )}
                  </button>

                  <button
                    onClick={handleStopTimer}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg transition hover:scale-105"
                    title="Stop and save"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>

                  <button
                    onClick={resetTimer}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                    title="Reset"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-slate-300">
                  Today's tracked
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatDuration(
                    timeEntries
                      .filter(
                        (entry) =>
                          entry.date ===
                          new Date()
                            .toISOString()
                            .split("T")[0]
                      )
                      .reduce(
                        (sum, entry) => sum + entry.duration,
                        0
                      )
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-slate-300">
                  Billable time
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatDuration(billableMinutes)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-slate-300">
                  Billable value
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Total Time
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {formatDuration(totalMinutes)}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    All tracked hours
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Billable Time
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {formatDuration(billableMinutes)}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    {billableRate}% of tracked time
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
                    Billable Value
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {formatCurrency(totalValue)}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Based on hourly rates
                  </p>
                </div>

                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-pink-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Avg. Rate
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-950">
                    {billableMinutes > 0
                      ? formatCurrency(
                          Math.round(
                            totalValue /
                              (billableMinutes / 60)
                          )
                        )
                      : "₹0"}
                  </p>

                  <p className="mt-1 text-xs text-orange-600">
                    Per billable hour
                  </p>
                </div>

                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search time entries, tasks or projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <select
                value={projectFilter}
                onChange={(e) =>
                  setProjectFilter(e.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="All">All Projects</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </div>
          </div>

          {/* Time Entries */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Time Entries
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Review and manage all tracked work.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {filteredEntries.length} entries
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group border-b border-slate-100 p-5 transition hover:bg-cyan-50/20"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getProjectGradient(
                        entry.projectName
                      )} text-white shadow-sm`}
                    >
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <div className="min-w-[250px] flex-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        {entry.description}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />

                        <span className="text-xs font-semibold text-slate-500">
                          {entry.projectName}
                        </span>

                        {entry.taskName && (
                          <>
                            <span className="text-slate-300">•</span>

                            <span className="truncate text-xs text-slate-400">
                              {entry.taskName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="min-w-[100px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Duration
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatDuration(entry.duration)}
                      </p>
                    </div>

                    <div className="min-w-[110px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Date
                      </p>

                      <div className="mt-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                        <span className="text-xs font-semibold text-slate-700">
                          {entry.date}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Rate
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatCurrency(entry.hourlyRate)}/hr
                      </p>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Value
                      </p>

                      <p className="mt-1 text-sm font-bold text-emerald-600">
                        {entry.billable
                          ? formatCurrency(
                              (entry.duration / 60) *
                                entry.hourlyRate
                            )
                          : "Non-billable"}
                      </p>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuId(
                            menuId === entry.id
                              ? null
                              : entry.id
                          )
                        }
                        className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {menuId === entry.id && (
                        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                          <button
                            onClick={() =>
                              handleDuplicate(entry)
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </button>

                          <button
                            onClick={() => {
                              setDeleteId(entry.id);
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

                  <div className="ml-[68px] mt-3 flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        entry.billable
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {entry.billable
                        ? "Billable"
                        : "Non-billable"}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      {entry.billable
                        ? "Included in revenue calculations"
                        : "Excluded from billable value"}
                    </span>
                  </div>
                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div className="p-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-400">
                    <Clock3 className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    No time entries found
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Start tracking or add a manual entry.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getProjectGradient(
                        entry.projectName
                      )} text-white`}
                    >
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {entry.description}
                          </h3>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {entry.projectName}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            setMenuId(
                              menuId === entry.id
                                ? null
                                : entry.id
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
                    <div className="rounded-xl bg-cyan-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-cyan-500">
                        Duration
                      </p>

                      <p className="mt-1 text-sm font-bold text-cyan-900">
                        {formatDuration(entry.duration)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-emerald-500">
                        Value
                      </p>

                      <p className="mt-1 text-sm font-bold text-emerald-900">
                        {entry.billable
                          ? formatCurrency(
                              (entry.duration / 60) *
                                entry.hourlyRate
                            )
                          : "₹0"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {entry.date}
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        entry.billable
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {entry.billable
                        ? "Billable"
                        : "Non-billable"}
                    </span>
                  </div>
                </div>
              ))}

              {filteredEntries.length === 0 && (
                <div className="p-12 text-center">
                  <Clock3 className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No time entries found
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom banner */}
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Receipt className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Turn tracked hours into invoices
                  </p>

                  <p className="mt-1 text-xs text-cyan-100">
                    Use your billable work to keep client billing accurate.
                  </p>
                </div>
              </div>

              <a
                href="/invoices"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-cyan-100"
              >
                View Invoices
                <ArrowRightIcon />
              </a>
            </div>
          </div>
        </main>

        {/* Add Time Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                      <Timer className="h-4 w-4" />
                      Time Tracking
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      Add Time Entry
                    </h2>

                    <p className="mt-1 text-sm text-cyan-100">
                      Log work manually for a project.
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

              <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Description *
                    </label>

                    <input
                      value={newEntry.description}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          description: e.target.value,
                        })
                      }
                      placeholder="Homepage development"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project *
                    </label>

                    <select
                      value={newEntry.projectId}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          projectId: e.target.value,
                          taskId: "",
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="">Select project</option>

                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Task
                    </label>

                    <select
                      value={newEntry.taskId}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          taskId: e.target.value,
                        })
                      }
                      disabled={!newEntry.projectId}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="">
                        {newEntry.projectId
                          ? "Select task"
                          : "Select project first"}
                      </option>

                      {selectedProjectTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Date *
                    </label>

                    <input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          date: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Hourly Rate
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={newEntry.hourlyRate}
                        onChange={(e) =>
                          setNewEntry({
                            ...newEntry,
                            hourlyRate: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Hours
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={newEntry.hours}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          hours: e.target.value,
                        })
                      }
                      placeholder="2"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Minutes
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={newEntry.minutes}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          minutes: e.target.value,
                        })
                      }
                      placeholder="30"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <input
                        type="checkbox"
                        checked={newEntry.billable}
                        onChange={(e) =>
                          setNewEntry({
                            ...newEntry,
                            billable: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded accent-emerald-600"
                      />

                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          Billable time
                        </p>

                        <p className="mt-0.5 text-xs text-emerald-600">
                          Include this work in billable revenue calculations.
                        </p>
                      </div>
                    </label>
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
                    onClick={handleAddEntry}
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 hover:-translate-y-0.5"
                  >
                    Add Time Entry
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
                Delete this time entry?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This tracked work will be permanently removed.
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
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}