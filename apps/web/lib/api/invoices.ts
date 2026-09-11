import { api } from "./http";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface ApiInvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  invoiceId: number;
}

export interface ApiInvoice {
  id: number;
  number: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  description: string;
  tax: number;
  discount: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
  clientId: number | null;
  projectId: number | null;
  items: ApiInvoiceItem[];
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  rate: number;
}

export interface CreateInvoiceInput {
  number: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status?: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  description?: string;
  tax?: number;
  discount?: number;
  clientId?: number | null;
  projectId?: number | null;
  items?: InvoiceItemInput[];
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

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

export async function getInvoices() {
  return api.get<ApiInvoice[]>("/api/invoices");
}

export async function getInvoice(id: number) {
  return api.get<ApiInvoice>(`/api/invoices/${id}`);
}

export async function createInvoice(data: CreateInvoiceInput) {
  return api.post<ApiInvoice>("/api/invoices", {
    ...data,
    issueDate: normalizeDate(data.issueDate),
    dueDate: normalizeDate(data.dueDate),
  });
}

export async function updateInvoice(
  id: number,
  data: UpdateInvoiceInput,
) {
  return api.patch<ApiInvoice>(`/api/invoices/${id}`, {
    ...data,
    ...(data.issueDate
      ? { issueDate: normalizeDate(data.issueDate) }
      : {}),
    ...(data.dueDate
      ? { dueDate: normalizeDate(data.dueDate) }
      : {}),
  });
}

export async function deleteInvoice(id: number) {
  return api.delete(`/api/invoices/${id}`);
}