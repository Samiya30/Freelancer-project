import { api } from "./http";

export type ExpenseCategory =
  | "Software"
  | "Marketing"
  | "Travel"
  | "Office"
  | "Equipment"
  | "Utilities"
  | "Other";

export type ExpenseStatus = "Paid" | "Pending";

export interface ApiExpense {
  id: number;
  title: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: ExpenseStatus;
  project: string | null;
  vendor: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
  projectId: number | null;
}

export interface CreateExpenseInput {
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: ExpenseStatus;
  project?: string | null;
  vendor?: string | null;
  projectId?: number | null;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

function normalizeDate(value: string) {
  const date = new Date(
    value.length === 10
      ? `${value}T00:00:00.000Z`
      : value,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export async function getExpenses() {
  return api.get<ApiExpense[]>("/api/expenses");
}

export async function getExpense(id: number) {
  return api.get<ApiExpense>(`/api/expenses/${id}`);
}

export async function createExpense(data: CreateExpenseInput) {
  return api.post<ApiExpense>("/api/expenses", {
    ...data,
    date: normalizeDate(data.date),
  });
}

export async function updateExpense(
  id: number,
  data: UpdateExpenseInput,
) {
  return api.patch<ApiExpense>(`/api/expenses/${id}`, {
    ...data,
    ...(data.date
      ? { date: normalizeDate(data.date) }
      : {}),
  });
}

export async function deleteExpense(id: number) {
  return api.delete(`/api/expenses/${id}`);
}