import { api } from "./http";

export interface ApiTimeEntry {
  id: number;
  description: string;
  projectId: number;
  projectName: string;
  taskId: number | null;
  taskName: string | null;
  date: string;
  duration: number;
  billable: boolean;
  hourlyRate: number;
  createdAt: string;
}

export interface CreateTimeEntryInput {
  description: string;
  projectId: number;
  taskId?: number;
  date: string;
  duration: number;
  billable?: boolean;
  hourlyRate?: number;
}

export interface UpdateTimeEntryInput {
  description?: string;
  projectId?: number;
  taskId?: number | null;
  date?: string;
  duration?: number;
  billable?: boolean;
  hourlyRate?: number;
}

function normalizeDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export async function getTimeEntries() {
  return api.get<ApiTimeEntry[]>("/api/time");
}

export async function getTimeEntry(id: number) {
  return api.get<ApiTimeEntry>(`/api/time/${id}`);
}

export async function createTimeEntry(data: CreateTimeEntryInput) {
  return api.post<ApiTimeEntry>("/api/time", {
    ...data,
    date: normalizeDate(data.date),
  });
}

export async function updateTimeEntry(
  id: number,
  data: UpdateTimeEntryInput
) {
  return api.patch<ApiTimeEntry>(`/api/time/${id}`, {
    ...data,
    date: data.date ? normalizeDate(data.date) : undefined,
  });
}

export async function deleteTimeEntry(id: number) {
  return api.delete(`/api/time/${id}`);
}