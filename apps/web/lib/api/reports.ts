import { api } from "./http";

export type ReportProject = {
  id: number;
  name: string;
  client: string;
  status: string;
  progress: number;
  budget: number;
  startDate: string;
  endDate: string;
  description: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type ReportInvoice = {
  id: number;
  number: string;
  client: string;
  project: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type ReportPayment = {
  id: number;
  invoiceId: number | null;
  clientName: string;
  projectName: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  reference: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type ReportExpense = {
  id: number;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  client: string | null;
  project: string | null;
  notes: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type ReportClient = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export interface ReportsData {
  year: number;
  projects: ReportProject[];
  invoices: ReportInvoice[];
  payments: ReportPayment[];
  expenses: ReportExpense[];
  clients: ReportClient[];
}

export async function getReports(year: number) {
  return api.get<ReportsData>(`/api/reports?year=${year}`);
}