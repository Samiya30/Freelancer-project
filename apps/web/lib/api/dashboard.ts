import { api } from "./http";

export interface DashboardStats {
  revenueThisMonth: number;
  outstandingInvoices: number;
  outstandingInvoiceCount: number;
  activeClients: number;
  hoursWorked: number;
}

export interface DashboardRevenue {
  monthly: number[];
  chart: number[];
}

export interface DashboardProject {
  id: number;
  name: string;
  client: string;
  progress: number;
  budget: number;
  status: string;
  startDate: string;
  dueDate: string;
}

export interface DashboardInvoice {
  id: number;
  number: string;
  client: string;
  amount: number;
  status: string;
  issueDate: string;
}

export interface DashboardOutstandingInvoice {
  id: number;
  number: string;
  client: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate: string;
}

export interface DashboardData {
  year: number;
  stats: DashboardStats;
  revenue: DashboardRevenue;
  projects: DashboardProject[];
  invoices: DashboardInvoice[];
  outstandingInvoices: DashboardOutstandingInvoice[];
}

export async function getDashboard(year: number) {
  return api.get<DashboardData>(`/api/dashboard?year=${year}`);
}