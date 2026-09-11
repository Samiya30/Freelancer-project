import { api } from "./http";

export type ContractStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Signed"
  | "Expired"
  | "Cancelled";

export interface ApiContractClient {
  id: number;
  name: string;
  email: string;
  company: string;
}

export interface ApiContract {
  id: number;
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  value: number;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  clientId: number | null;
  clientRecord?: ApiContractClient | null;
}

export interface CreateContractInput {
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  value: number;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  description?: string;
  clientId?: number | null;
}

export type UpdateContractInput = Partial<CreateContractInput>;

function normalizeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export async function getContracts() {
  return api.get<ApiContract[]>("/api/contracts");
}

export async function getContract(id: number) {
  return api.get<ApiContract>(`/api/contracts/${id}`);
}

export async function createContract(data: CreateContractInput) {
  return api.post<ApiContract>("/api/contracts", {
    ...data,
    startDate: normalizeDate(data.startDate),
    endDate: normalizeDate(data.endDate),
  });
}

export async function updateContract(
  id: number,
  data: UpdateContractInput
) {
  return api.patch<ApiContract>(`/api/contracts/${id}`, {
    ...data,
    startDate: normalizeDate(data.startDate),
    endDate: normalizeDate(data.endDate),
  });
}

export async function deleteContract(id: number) {
  return api.delete(`/api/contracts/${id}`);
}