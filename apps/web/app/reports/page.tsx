"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getReports,
  type ReportsData,
} from "@/lib/api/reports";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  WalletCards,
  Receipt,
  BriefcaseBusiness,
  FileText,
  Download,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Target,
} from "lucide-react";

type ReportTab =
  | "Overview"
  | "Financial"
  | "Projects"
  | "Invoices";

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function ReportsPage() {
  const { showToast } = useToast();

  const [year, setYear] = useState("2026");
  const [activeTab, setActiveTab] =
    useState<ReportTab>("Overview");

  const [reportData, setReportData] =
    useState<ReportsData | null>(null);

  const [loading, setLoading] = useState(true);

  const selectedYear = Number(year);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setLoading(true);

        const response = await getReports(selectedYear);

        if (cancelled) {
          return;
        }

        if (!response.data) {
          throw new Error(
            "Reports loaded but no report data was returned."
          );
        }

        setReportData(response.data);
      } catch (error) {
        console.error("Failed to load reports:", error);

        if (!cancelled) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load reports.",
            "error"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, showToast]);

  const projects = reportData?.projects ?? [];
  const invoices = reportData?.invoices ?? [];
  const payments = reportData?.payments ?? [];
  const expenses = reportData?.expenses ?? [];
  const clients = reportData?.clients ?? [];

  const yearExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          new Date(expense.date).getFullYear() ===
          selectedYear
      ),
    [expenses, selectedYear]
  );

  const yearInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          new Date(invoice.issueDate).getFullYear() ===
          selectedYear
      ),
    [invoices, selectedYear]
  );

  const yearPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          new Date(payment.date).getFullYear() ===
          selectedYear
      ),
    [payments, selectedYear]
  );

  const totalRevenue = yearPayments
    .filter(
      (payment) => payment.status === "Completed"
    )
    .reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

  const totalExpenses = yearExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const netProfit = totalRevenue - totalExpenses;

  const averageMonthlyRevenue =
    totalRevenue / 12;

  const pendingPayments = yearPayments
    .filter(
      (payment) => payment.status === "Pending"
    )
    .reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

  const overdueInvoices = yearInvoices.filter(
    (invoice) => invoice.status === "Overdue"
  );

  const paidInvoices = yearInvoices.filter(
    (invoice) => invoice.status === "Paid"
  );

  const acceptedProjects = projects.filter(
    (project) =>
      project.status === "Completed" ||
      project.status === "In Progress"
  );

  const profitMargin =
    totalRevenue > 0
      ? (netProfit / totalRevenue) * 100
      : 0;

  const revenueByMonth = Array.from(
    { length: 12 },
    (_, month) => {
      const revenue = yearPayments
        .filter(
          (payment) =>
            payment.status === "Completed" &&
            new Date(payment.date).getMonth() ===
              month
        )
        .reduce(
          (sum, payment) =>
            sum + payment.amount,
          0
        );

      const expense = yearExpenses
        .filter(
          (item) =>
            new Date(item.date).getMonth() ===
            month
        )
        .reduce(
          (sum, item) =>
            sum + item.amount,
          0
        );

      return {
        month: new Date(
          selectedYear,
          month,
          1
        ).toLocaleString("en-IN", {
          month: "short",
        }),
        revenue,
        expense,
      };
    }
  );

  const maxChartValue = Math.max(
    ...revenueByMonth.flatMap((item) => [
      item.revenue,
      item.expense,
    ]),
    1
  );

  const expenseByCategory = Array.from(
    new Set(
      yearExpenses.map(
        (expense) => expense.category
      )
    )
  )
    .map((category) => ({
      category,
      amount: yearExpenses
        .filter(
          (expense) =>
            expense.category === category
        )
        .reduce(
          (sum, expense) =>
            sum + expense.amount,
          0
        ),
    }))
    .sort(
      (a, b) => b.amount - a.amount
    );

  const maxExpenseCategory = Math.max(
    ...expenseByCategory.map(
      (item) => item.amount
    ),
    1
  );

  const projectPerformance = projects.map(
    (project) => {
      const projectInvoices =
        yearInvoices.filter(
          (invoice) =>
            invoice.project === project.name
        );

      const projectPayments =
        yearPayments
          .filter(
            (payment) =>
              payment.projectName ===
                project.name &&
              payment.status ===
                "Completed"
          )
          .reduce(
            (sum, payment) =>
              sum + payment.amount,
            0
          );

      const projectExpenses =
        yearExpenses
          .filter(
            (expense) =>
              expense.project ===
              project.name
          )
          .reduce(
            (sum, expense) =>
              sum + expense.amount,
            0
          );

      return {
        ...project,
        invoiced:
          projectInvoices.reduce(
            (sum, invoice) =>
              sum + invoice.amount,
            0
          ),
        revenue: projectPayments,
        expenses: projectExpenses,
        profit:
          projectPayments -
          projectExpenses,
      };
    }
  );

  const handleExport = () => {
    const rows = revenueByMonth.map(
      (item) => [
        item.month,
        item.revenue,
        item.expense,
        item.revenue - item.expense,
      ]
    );

    const csv = [
      [
        "Month",
        "Revenue",
        "Expenses",
        "Profit",
      ],
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `freelanceos-report-${year}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast(
      "Report exported successfully.",
      "success"
    );
  };

  const tabs: ReportTab[] = [
    "Overview",
    "Financial",
    "Projects",
    "Invoices",
  ];

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Business Intelligence
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Reports
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Understand revenue, expenses,
                  profitability and project
                  performance.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="2026">
                    2026
                  </option>

                  <option value="2025">
                    2025
                  </option>
                </select>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Download className="h-4 w-4" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <ReportsLoading />
          ) : (
            <>
              {/* Hero */}
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-6 text-white shadow-xl sm:p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100 backdrop-blur">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {year} Business Overview
                    </div>

                    <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                      {formatCurrency(
                        netProfit
                      )}
                    </h2>

                    <p className="mt-2 text-sm text-slate-300">
                      Estimated net profit after
                      recorded business expenses.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Revenue
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {formatCurrency(
                            totalRevenue
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Expenses
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {formatCurrency(
                            totalExpenses
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Margin
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {profitMargin.toFixed(
                            1
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner">
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white text-slate-900 shadow-2xl">
                      <Target className="h-6 w-6 text-violet-600" />

                      <span className="mt-1 text-2xl font-bold">
                        {profitMargin.toFixed(
                          0
                        )}
                        %
                      </span>

                      <span className="text-[10px] font-semibold text-slate-400">
                        Profit Margin
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex min-w-max gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() =>
                        setActiveTab(tab)
                      }
                      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overview */}
              {activeTab === "Overview" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <ReportStat
                      title="Revenue"
                      value={formatCurrency(
                        totalRevenue
                      )}
                      subtitle="Collected payments"
                      icon={
                        <IndianRupee className="h-5 w-5" />
                      }
                      className="from-emerald-50 to-teal-50 text-emerald-700"
                    />

                    <ReportStat
                      title="Expenses"
                      value={formatCurrency(
                        totalExpenses
                      )}
                      subtitle="Business spending"
                      icon={
                        <TrendingDown className="h-5 w-5" />
                      }
                      className="from-orange-50 to-pink-50 text-orange-700"
                    />

                    <ReportStat
                      title="Net Profit"
                      value={formatCurrency(
                        netProfit
                      )}
                      subtitle={`${profitMargin.toFixed(
                        1
                      )}% margin`}
                      icon={
                        <TrendingUp className="h-5 w-5" />
                      }
                      className="from-violet-50 to-fuchsia-50 text-violet-700"
                    />

                    <ReportStat
                      title="Avg. Monthly"
                      value={formatCurrency(
                        averageMonthlyRevenue
                      )}
                      subtitle="Average revenue"
                      icon={
                        <BarChart3 className="h-5 w-5" />
                      }
                      className="from-blue-50 to-cyan-50 text-blue-700"
                    />
                  </div>

                  <RevenueChart
                    data={revenueByMonth}
                    maxValue={maxChartValue}
                  />

                  <div className="grid gap-6 xl:grid-cols-2">
                    <ExpenseBreakdown
                      data={expenseByCategory}
                      maxValue={
                        maxExpenseCategory
                      }
                    />

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Business Snapshot
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          Key numbers that need
                          your attention.
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        <SnapshotRow
                          icon={
                            <WalletCards className="h-4 w-4" />
                          }
                          title="Pending Payments"
                          value={formatCurrency(
                            pendingPayments
                          )}
                          description="Expected incoming cash"
                          type="warning"
                        />

                        <SnapshotRow
                          icon={
                            <Receipt className="h-4 w-4" />
                          }
                          title="Overdue Invoices"
                          value={String(
                            overdueInvoices.length
                          )}
                          description="Invoices requiring follow-up"
                          type="danger"
                        />

                        <SnapshotRow
                          icon={
                            <BriefcaseBusiness className="h-4 w-4" />
                          }
                          title="Active Projects"
                          value={String(
                            acceptedProjects.filter(
                              (project) =>
                                project.status !==
                                "Completed"
                            ).length
                          )}
                          description="Projects currently underway"
                          type="info"
                        />

                        <SnapshotRow
                          icon={
                            <CheckCircle2 className="h-4 w-4" />
                          }
                          title="Paid Invoices"
                          value={String(
                            paidInvoices.length
                          )}
                          description="Successfully collected"
                          type="success"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Financial */}
              {activeTab === "Financial" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ReportStat
                      title="Total Revenue"
                      value={formatCurrency(
                        totalRevenue
                      )}
                      subtitle="Completed payments"
                      icon={
                        <TrendingUp className="h-5 w-5" />
                      }
                      className="from-emerald-50 to-teal-50 text-emerald-700"
                    />

                    <ReportStat
                      title="Total Expenses"
                      value={formatCurrency(
                        totalExpenses
                      )}
                      subtitle="Recorded spending"
                      icon={
                        <TrendingDown className="h-5 w-5" />
                      }
                      className="from-rose-50 to-orange-50 text-rose-700"
                    />

                    <ReportStat
                      title="Net Profit"
                      value={formatCurrency(
                        netProfit
                      )}
                      subtitle={`${profitMargin.toFixed(
                        1
                      )}% margin`}
                      icon={
                        <WalletCards className="h-5 w-5" />
                      }
                      className="from-violet-50 to-fuchsia-50 text-violet-700"
                    />
                  </div>

                  <RevenueChart
                    data={revenueByMonth}
                    maxValue={maxChartValue}
                  />

                  <ExpenseBreakdown
                    data={expenseByCategory}
                    maxValue={maxExpenseCategory}
                  />
                </>
              )}

              {/* Projects */}
              {activeTab === "Projects" && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-5 py-5">
                    <h2 className="text-base font-bold text-slate-900">
                      Project Performance
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Revenue and profitability
                      by project.
                    </p>
                  </div>

                  {projectPerformance.length ===
                  0 ? (
                    <div className="p-12 text-center">
                      <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No projects found
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[900px]">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Project
                              </th>

                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Status
                              </th>

                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Progress
                              </th>

                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Revenue
                              </th>

                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Expenses
                              </th>

                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Profit
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {projectPerformance.map(
                              (project) => (
                                <tr
                                  key={
                                    project.id
                                  }
                                  className="border-b border-slate-100 transition hover:bg-slate-50"
                                >
                                  <td className="px-5 py-5">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">
                                        {
                                          project.name
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-slate-400">
                                        {
                                          project.client
                                        }
                                      </p>
                                    </div>
                                  </td>

                                  <td className="px-5 py-5">
                                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                                      {
                                        project.status
                                      }
                                    </span>
                                  </td>

                                  <td className="px-5 py-5">
                                    <div className="w-32">
                                      <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>
                                          {
                                            project.progress
                                          }
                                          %
                                        </span>
                                      </div>

                                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                          style={{
                                            width: `${project.progress}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-5 py-5 text-sm font-bold text-emerald-600">
                                    {formatCurrency(
                                      project.revenue
                                    )}
                                  </td>

                                  <td className="px-5 py-5 text-sm font-bold text-rose-600">
                                    {formatCurrency(
                                      project.expenses
                                    )}
                                  </td>

                                  <td className="px-5 py-5">
                                    <span
                                      className={`text-sm font-bold ${
                                        project.profit >=
                                        0
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {formatCurrency(
                                        project.profit
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-slate-100 lg:hidden">
                        {projectPerformance.map(
                          (project) => (
                            <div
                              key={
                                project.id
                              }
                              className="p-5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    {
                                      project.name
                                    }
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      project.client
                                    }
                                  </p>
                                </div>

                                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                                  {
                                    project.status
                                  }
                                </span>
                              </div>

                              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                  style={{
                                    width: `${project.progress}%`,
                                  }}
                                />
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <MiniMetric
                                  label="Revenue"
                                  value={formatCurrency(
                                    project.revenue
                                  )}
                                  className="text-emerald-600"
                                />

                                <MiniMetric
                                  label="Expenses"
                                  value={formatCurrency(
                                    project.expenses
                                  )}
                                  className="text-rose-600"
                                />

                                <MiniMetric
                                  label="Profit"
                                  value={formatCurrency(
                                    project.profit
                                  )}
                                  className={
                                    project.profit >=
                                    0
                                      ? "text-violet-600"
                                      : "text-rose-600"
                                  }
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Invoices */}
              {activeTab === "Invoices" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <ReportStat
                      title="Invoices"
                      value={String(
                        yearInvoices.length
                      )}
                      subtitle="Issued this year"
                      icon={
                        <FileText className="h-5 w-5" />
                      }
                      className="from-blue-50 to-cyan-50 text-blue-700"
                    />

                    <ReportStat
                      title="Paid"
                      value={String(
                        paidInvoices.length
                      )}
                      subtitle="Successfully paid"
                      icon={
                        <CheckCircle2 className="h-5 w-5" />
                      }
                      className="from-emerald-50 to-teal-50 text-emerald-700"
                    />

                    <ReportStat
                      title="Pending"
                      value={formatCurrency(
                        pendingPayments
                      )}
                      subtitle="Incoming payments"
                      icon={
                        <Clock3 className="h-5 w-5" />
                      }
                      className="from-amber-50 to-orange-50 text-amber-700"
                    />

                    <ReportStat
                      title="Overdue"
                      value={String(
                        overdueInvoices.length
                      )}
                      subtitle="Need follow-up"
                      icon={
                        <AlertCircle className="h-5 w-5" />
                      }
                      className="from-rose-50 to-pink-50 text-rose-700"
                    />
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5">
                      <h2 className="text-base font-bold text-slate-900">
                        Invoice Summary
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Review invoice status for{" "}
                        {year}.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {yearInvoices.map(
                        (invoice) => (
                          <div
                            key={invoice.id}
                            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">
                                  {
                                    invoice.number
                                  }
                                </span>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                  {
                                    invoice.status
                                  }
                                </span>
                              </div>

                              <h3 className="mt-2 text-sm font-bold text-slate-900">
                                {
                                  invoice.client
                                }
                              </h3>

                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  invoice.project
                                }
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-5 sm:justify-end">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Amount
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-900">
                                  {formatCurrency(
                                    invoice.amount
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Due
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-700">
                                  {
                                    invoice.dueDate
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {yearInvoices.length ===
                        0 && (
                        <div className="p-12 text-center">
                          <FileText className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No invoices for{" "}
                            {year}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Insights */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 p-2.5 text-violet-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Business Insights
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Quick interpretation of
                      your current numbers.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <InsightCard
                    icon={
                      netProfit >= 0 ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )
                    }
                    title={
                      netProfit >= 0
                        ? "Positive profitability"
                        : "Profitability needs attention"
                    }
                    text={
                      netProfit >= 0
                        ? `Your recorded revenue is currently ${formatCurrency(
                            netProfit
                          )} higher than expenses.`
                        : `Your recorded expenses are currently ${formatCurrency(
                            Math.abs(
                              netProfit
                            )
                          )} higher than revenue.`
                    }
                  />

                  <InsightCard
                    icon={
                      <WalletCards className="h-5 w-5" />
                    }
                    title="Cash still to collect"
                    text={`${formatCurrency(
                      pendingPayments
                    )} is currently marked as pending.`}
                  />

                  <InsightCard
                    icon={
                      <BriefcaseBusiness className="h-5 w-5" />
                    }
                    title="Client base"
                    text={`You currently have ${clients.length} clients in your workspace.`}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}

function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-3xl bg-gradient-to-br from-slate-200 via-violet-100 to-fuchsia-100" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map(
          (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-slate-200"
            />
          )
        )}
      </div>

      <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
    </div>
  );
}

function ReportStat({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-gradient-to-br ${className} p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs opacity-70">
            {subtitle}
          </p>
        </div>

        <div className="rounded-xl bg-white/70 p-3 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function RevenueChart({
  data,
  maxValue,
}: {
  data: {
    month: string;
    revenue: number;
    expense: number;
  }[];
  maxValue: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Revenue vs Expenses
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Monthly financial performance.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-2 text-emerald-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Revenue
          </span>

          <span className="flex items-center gap-2 text-orange-600">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            Expenses
          </span>
        </div>
      </div>

      <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-7 sm:gap-3">
        {data.map((item) => (
          <div
            key={item.month}
            className="relative flex min-w-[45px] flex-1 items-end justify-center gap-1"
          >
            <div className="relative flex h-52 flex-1 items-end justify-end">
              <div
                className="w-full max-w-5 rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 transition hover:opacity-80"
                style={{
                  height: `${Math.max(
                    (item.revenue /
                      maxValue) *
                      100,
                    item.revenue > 0
                      ? 3
                      : 0
                  )}%`,
                }}
                title={`Revenue: ${formatCurrency(
                  item.revenue
                )}`}
              />
            </div>

            <div className="relative flex h-52 flex-1 items-end justify-start">
              <div
                className="w-full max-w-5 rounded-t-lg bg-gradient-to-t from-orange-500 to-pink-400 transition hover:opacity-80"
                style={{
                  height: `${Math.max(
                    (item.expense /
                      maxValue) *
                      100,
                    item.expense > 0
                      ? 3
                      : 0
                  )}%`,
                }}
                title={`Expenses: ${formatCurrency(
                  item.expense
                )}`}
              />
            </div>

            <span className="absolute mt-56 text-[10px] font-semibold text-slate-400">
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseBreakdown({
  data,
  maxValue,
}: {
  data: {
    category: string;
    amount: number;
  }[];
  maxValue: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Expense Breakdown
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Spending by business category.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {data.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No expenses recorded.
          </p>
        ) : (
          data.map((item) => (
            <div key={item.category}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {item.category}
                </span>

                <span className="text-xs font-bold text-slate-900">
                  {formatCurrency(
                    item.amount
                  )}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                  style={{
                    width: `${Math.max(
                      (item.amount /
                        maxValue) *
                        100,
                      3
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SnapshotRow({
  icon,
  title,
  value,
  description,
  type,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  type:
    | "success"
    | "warning"
    | "danger"
    | "info";
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-600",
    warning:
      "bg-amber-50 text-amber-600",
    danger:
      "bg-rose-50 text-rose-600",
    info: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div
        className={`rounded-xl p-2.5 ${styles[type]}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-400">
          {description}
        </p>
      </div>

      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}