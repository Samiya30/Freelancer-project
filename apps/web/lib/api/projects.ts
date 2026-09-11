import { api } from "./http";

export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "Review"
  | "Completed"
  | "On Hold";

export interface ApiProject {
  id: number;
  name: string;
  client: string;
  clientEmail: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  budget: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  client: string;
  clientEmail: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  budget: number;
  progress?: number;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

function normalizeDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export async function getProjects() {
  return api.get<ApiProject[]>("/api/projects");
}

export async function getProject(id: number) {
  return api.get<ApiProject>(`/api/projects/${id}`);
}

export async function createProject(data: CreateProjectInput) {
  return api.post<ApiProject>("/api/projects", {
    ...data,
    startDate: normalizeDate(data.startDate),
    dueDate: normalizeDate(data.dueDate),
  });
}

export async function updateProject(
  id: number,
  data: UpdateProjectInput
) {
  return api.patch<ApiProject>(`/api/projects/${id}`, {
    ...data,
    startDate: normalizeDate(data.startDate),
    dueDate: normalizeDate(data.dueDate),
  });
}

export async function deleteProject(id: number) {
  return api.delete(`/api/projects/${id}`);
}