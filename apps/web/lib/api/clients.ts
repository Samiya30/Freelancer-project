import { api } from "./http";

export interface ApiClient {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  status: "Active" | "Inactive";
  projects: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  email: string;
  phone?: string;
  company: string;
  status?: "Active" | "Inactive";
  projects?: number;
  totalRevenue?: number;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export async function getClients() {
  return api.get<ApiClient[]>("/api/clients");
}

export async function getClient(id: number) {
  return api.get<ApiClient>(`/api/clients/${id}`);
}

export async function createClient(data: CreateClientInput) {
  return api.post<ApiClient>("/api/clients", data);
}

export async function updateClient(
  id: number,
  data: UpdateClientInput
) {
  return api.patch<ApiClient>(`/api/clients/${id}`, data);
}

export async function deleteClient(id: number) {
  return api.delete(`/api/clients/${id}`);
}