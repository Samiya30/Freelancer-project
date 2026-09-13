"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  ExpenseCategory,
  ExpenseStatus,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  ApiExpense,
} from "@/lib/api/expenses";import { useToast } from "@/components/ui/ToastProvider";
import { getProjects, ApiProject } from "@/lib/api/projects";
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Download,
  X,
  IndianRupee,
  Receipt,
  TrendingDown,
  Clock3,
  CheckCircle2,
  CalendarDays,
  FolderKanban,
  Building2,
  ArrowRight,
  WalletCards,
} from "lucide-react";

const categories: ExpenseCategory[] = [
  "Software",
  "Marketing",
  "Travel",
  "Office",
  "Equipment",
  "Utilities",
  "Other",
];

const statuses: ExpenseStatus[] = ["Paid", "Pending"];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().split("T")[0];
}

function getCategoryStyle(category: ExpenseCategory) {
  switch (category) {
    case "Software":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Marketing":
      return "bg-pink-50 text-pink-700 border-pink-200";
    case "Travel":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Office":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Equipment":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "Utilities":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getCategoryIcon(category: ExpenseCategory) {
  switch (category) {
    case "Software":
      return "💻";
    case "Marketing":
      return "📣";
    case "Travel":
      return "✈️";
    case "Office":
      return "🏢";
    case "Equipment":
      return "🖥️";
    case "Utilities":
      return "⚡";
    default:
      return "📦";
  }
}

function getAvatarGradient(title: string) {
  const gradients = [
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-indigo-500 to-purple-500",
  ];

  const index =
    title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    gradients.length;

  return gradients[index];
}

interface UiExpense {
  id: number;
  title: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: ExpenseStatus;
  project: string | null;
  vendor: string | null;
  projectId: number | null;
}

function toUiExpense(expense: ApiExpense): UiExpense {
  return {
    id: expense.id,
    title: expense.title,
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
    date: formatDate(expense.date),
    status: expense.status,
    project: expense.project,
    vendor: expense.vendor,
    projectId: expense.projectId,
  };
}

export default function ExpensesPage() {
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<UiExpense[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | ExpenseCategory
  >("All");
  const [statusFilter, setStatusFilter] = useState<
    "All" | ExpenseStatus
  >("All");

  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    category: "Software" as ExpenseCategory,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    status: "Paid" as ExpenseStatus,
    project: "",
    projectId: null as number | null,
    vendor: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [expensesResponse, projectsResponse] = await Promise.all([
          getExpenses(),
          getProjects(),
        ]);

        if (!mounted) return;

        setExpenses(
          (expensesResponse.data ?? []).map(toUiExpense)
        );

        setProjects(projectsResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load expenses:", error);

        if (mounted) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load expenses.",
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

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !query ||
        expense.title.toLowerCase().includes(query) ||
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        expense.project?.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All" ||
        expense.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        expense.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [
    expenses,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const paidExpenses = expenses
    .filter((expense) => expense.status === "Paid")
    .reduce((sum, expense) => sum + expense.amount, 0);

  const pendingExpenses = expenses
    .filter((expense) => expense.status === "Pending")
    .reduce((sum, expense) => sum + expense.amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(expense.date);

      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const categoryTotals = categories.map((category) => ({
    category,
    total: expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));

  const maxCategoryTotal = Math.max(
    ...categoryTotals.map((item) => item.total),
    1
  );

  const resetForm = () => {
    setNewExpense({
      title: "",
      description: "",
      category: "Software",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      status: "Paid",
      project: "",
      projectId: null,
      vendor: "",
    });
  };

  const handleProjectChange = (projectName: string) => {
    const project = projects.find(
      (item) => item.name === projectName
    );

    setNewExpense({
      ...newExpense,
      project: projectName,
      projectId: project?.id ?? null,
    });
  };

  const handleAddExpense = async () => {
    if (
      !newExpense.title.trim() ||
      !newExpense.amount ||
      !newExpense.date
    ) {
      showToast("Please complete the required fields.", "error");
      return;
    }

    const amount = Number(newExpense.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Please enter a valid expense amount.", "error");
      return;
    }

    try {
      setSaving(true);

      const response = await createExpense({
        title: newExpense.title.trim(),
        description: newExpense.description.trim(),
        category: newExpense.category,
        amount,
        date: newExpense.date,
        status: newExpense.status,
        project: newExpense.project || null,
        vendor: newExpense.vendor.trim() || null,
        projectId: newExpense.projectId,
      });

      if (response.data) {
        setExpenses((current) => [
          toUiExpense(response.data!),
          ...current,
        ]);
      }

      resetForm();
      setAddOpen(false);

      showToast("Expense added successfully.", "success");
    } catch (error) {
      console.error("Failed to create expense:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to add expense.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (expense: UiExpense) => {
    try {
      setSaving(true);

      const response = await createExpense({
        title: `${expense.title} Copy`,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        status: "Pending",
        project: expense.project,
        vendor: expense.vendor,
        projectId: expense.projectId,
      });

      if (response.data) {
        setExpenses((current) => [
          toUiExpense(response.data!),
          ...current,
        ]);
      }

      setMenuId(null);

      showToast("Expense duplicated.", "success");
    } catch (error) {
      console.error("Failed to duplicate expense:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate expense.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (expense: UiExpense) => {
    try {
      setSaving(true);

      const response = await updateExpense(expense.id, {
        status: "Paid",
      });

      if (response.data) {
        const updatedExpense = toUiExpense(response.data);

        setExpenses((current) =>
          current.map((item) =>
            item.id === expense.id ? updatedExpense : item
          )
        );
      }

      setMenuId(null);

      showToast("Expense marked as paid.", "success");
    } catch (error) {
      console.error("Failed to update expense:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update expense.",
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

      await deleteExpense(deleteId);

      setExpenses((current) =>
        current.filter((expense) => expense.id !== deleteId)
      );

      setDeleteId(null);
      setMenuId(null);

      showToast("Expense deleted successfully.", "success");
    } catch (error) {
      console.error("Failed to delete expense:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete expense.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Title",
      "Description",
      "Category",
      "Amount",
      "Date",
      "Status",
      "Project",
      "Vendor",
    ];

    const rows = filteredExpenses.map((expense) => [
      expense.title,
      expense.description,
      expense.category,
      expense.amount,
      expense.date,
      expense.status,
      expense.project ?? "",
      expense.vendor ?? "",
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
    link.download = "freelanceos-expenses.csv";
    link.click();

    URL.revokeObjectURL(url);

    showToast("Expenses exported.", "success");
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Business Expenses
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Expenses
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Track business spending and understand where your money goes.
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Total Expenses
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-950">
                    {formatCurrency(totalExpenses)}
                  </p>

                  <p className="mt-1 text-xs text-orange-600">
                    All recorded expenses
                  </p>
                </div>

                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
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
                    {formatCurrency(paidExpenses)}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Already settled
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Pending
                  </p>

                  <p className="mt-2 text-3xl font-bold text-amber-950">
                    {formatCurrency(pendingExpenses)}
                  </p>

                  <p className="mt-1 text-xs text-amber-600">
                    Needs payment
                  </p>
                </div>

                <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    This Month
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {formatCurrency(thisMonthExpenses)}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    Current month spending
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Spending by Category
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  See which areas consume the most of your business budget.
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
                {categories.length} categories
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categoryTotals.map((item) => (
                <div
                  key={item.category}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getCategoryIcon(item.category)}
                      </span>

                      <span className="text-xs font-bold text-slate-700">
                        {item.category}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(item.total)}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                      style={{
                        width: `${Math.max(
                          (item.total / maxCategoryTotal) * 100,
                          item.total > 0 ? 5 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
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
                  placeholder="Search expenses, vendors, projects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value as "All" | ExpenseCategory
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="All">All Categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "All" | ExpenseStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="All">All Statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/70 via-white to-pink-50/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Expense Records
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Manage and review your business expenses.
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {loading
                    ? "Loading..."
                    : `${filteredExpenses.length} records`}
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              {loading ? (
                <div className="p-14 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />

                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    Loading expenses...
                  </p>
                </div>
              ) : (
                <>
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="group border-b border-slate-100 p-5 transition hover:bg-orange-50/20"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                            expense.title
                          )} text-xl shadow-sm`}
                        >
                          {getCategoryIcon(expense.category)}
                        </div>

                        <div className="min-w-[250px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getCategoryStyle(
                                expense.category
                              )}`}
                            >
                              {expense.category}
                            </span>

                            {expense.status === "Paid" ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                Paid
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                                Pending
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 text-sm font-bold text-slate-900">
                            {expense.title}
                          </h3>

                          <p className="mt-0.5 max-w-md truncate text-xs text-slate-400">
                            {expense.description || "No description"}
                          </p>
                        </div>

                        <div className="min-w-[150px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Project
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5 text-violet-500" />

                            <span className="max-w-[140px] truncate text-xs font-semibold text-slate-700">
                              {expense.project || "General"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[120px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Vendor
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-blue-500" />

                            <span className="max-w-[120px] truncate text-xs font-semibold text-slate-700">
                              {expense.vendor || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[130px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Amount
                          </p>

                          <p className="mt-1 text-sm font-bold text-rose-600">
                            - {formatCurrency(expense.amount)}
                          </p>
                        </div>

                        <div className="min-w-[110px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Date
                          </p>

                          <div className="mt-1 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />

                            <span className="text-xs font-semibold text-slate-700">
                              {expense.date}
                            </span>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenuId(
                                menuId === expense.id
                                  ? null
                                  : expense.id
                              )
                            }
                            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {menuId === expense.id && (
                            <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                              {expense.status === "Pending" && (
                                <button
                                  onClick={() =>
                                    handleMarkPaid(expense)
                                  }
                                  disabled={saving}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Mark as Paid
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  handleDuplicate(expense)
                                }
                                disabled={saving}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteId(expense.id);
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
                    </div>
                  ))}

                  {filteredExpenses.length === 0 && (
                    <div className="p-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-400">
                        <Receipt className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No expenses found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another filter or add a new expense.
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
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />

                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    Loading expenses...
                  </p>
                </div>
              ) : (
                <>
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                            expense.title
                          )} text-lg`}
                        >
                          {getCategoryIcon(expense.category)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getCategoryStyle(
                                  expense.category
                                )}`}
                              >
                                {expense.category}
                              </span>

                              <h3 className="mt-2 text-sm font-bold text-slate-900">
                                {expense.title}
                              </h3>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {expense.vendor || "No vendor"}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setMenuId(
                                  menuId === expense.id
                                    ? null
                                    : expense.id
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
                        <div className="rounded-xl bg-rose-50 p-3">
                          <p className="text-[10px] font-semibold uppercase text-rose-500">
                            Amount
                          </p>

                          <p className="mt-1 text-sm font-bold text-rose-900">
                            - {formatCurrency(expense.amount)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-blue-50 p-3">
                          <p className="text-[10px] font-semibold uppercase text-blue-500">
                            Date
                          </p>

                          <p className="mt-1 text-sm font-bold text-blue-900">
                            {expense.date}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <FolderKanban className="h-3.5 w-3.5" />
                          {expense.project || "General"}
                        </span>

                        <span
                          className={
                            expense.status === "Paid"
                              ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
                          }
                        >
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredExpenses.length === 0 && (
                    <div className="p-14 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-400">
                        <Receipt className="h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        No expenses found
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Try another filter or add a new expense.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    See your real business profitability
                  </p>

                  <p className="mt-1 text-xs text-orange-100">
                    Compare revenue, expenses and net profit in one place.
                  </p>
                </div>
              </div>

              <a
                href="/reports"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-orange-100"
              >
                View Reports
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>

        {/* Add Expense Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-orange-100">
                      <TrendingDown className="h-4 w-4" />
                      Business Finance
                    </div>

                    <h2 className="mt-1 text-xl font-bold">
                      Add Expense
                    </h2>

                    <p className="mt-1 text-sm text-orange-100">
                      Record a business expense.
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
                    Expense Title *
                  </label>

                  <input
                    value={newExpense.title}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Adobe Creative Cloud"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Add notes about this expense..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Category *
                    </label>

                    <select
                      value={newExpense.category}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryIcon(category)} {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Amount *
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="number"
                        min="0"
                        value={newExpense.amount}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            amount: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Date *
                    </label>

                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          date: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={newExpense.status}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          status: e.target.value as ExpenseStatus,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Project
                    </label>

                    <select
                      value={newExpense.project}
                      onChange={(e) =>
                        handleProjectChange(e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">General / No Project</option>

                      {projects.map((project) => (
                        <option key={project.id} value={project.name}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Vendor
                    </label>

                    <input
                      value={newExpense.vendor}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          vendor: e.target.value,
                        })
                      }
                      placeholder="e.g. Adobe"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 text-orange-600 shadow-sm">
                      <Receipt className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-orange-900">
                        Expense tracking
                      </p>

                      <p className="mt-1 text-xs text-orange-600">
                        This expense will automatically appear in your
                        financial reports.
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
                    onClick={handleAddExpense}
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Add Expense"}
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
                Delete this expense?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This expense will be permanently removed from your records.
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
                  {saving ? "Deleting..." : "Delete Expense"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </AppShell>
  );
}