import { api } from "./http";

export type PaymentStatus = "Completed" | "Pending" | "Failed";

export type PaymentMethod =
  | "UPI"
  | "BankTransfer"
  | "Card"
  | "Cash";

export interface ApiPayment {
  id: number;
  paymentNumber: string;
  clientName: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  userId: number;
  clientId: number | null;
  invoiceId: number | null;
  projectId: number | null;
}

export interface CreatePaymentInput {
  paymentNumber: string;
  clientName: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  clientId?: number | null;
  invoiceId?: number | null;
  projectId?: number | null;
}

export type UpdatePaymentInput = Partial<CreatePaymentInput>;

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

export async function getPayments() {
  return api.get<ApiPayment[]>("/api/payments");
}

export async function getPayment(id: number) {
  return api.get<ApiPayment>(`/api/payments/${id}`);
}

export async function createPayment(data: CreatePaymentInput) {
  return api.post<ApiPayment>("/api/payments", {
    ...data,
    date: normalizeDate(data.date),
  });
}

export async function updatePayment(
  id: number,
  data: UpdatePaymentInput,
) {
  return api.patch<ApiPayment>(`/api/payments/${id}`, {
    ...data,
    ...(data.date
      ? { date: normalizeDate(data.date) }
      : {}),
  });
}

export async function deletePayment(id: number) {
  return api.delete(`/api/payments/${id}`);
}