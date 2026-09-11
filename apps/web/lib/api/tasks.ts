import { api } from "./http";

export type TaskStatus =
  | "ToDo"
  | "InProgress"
  | "Review"
  | "Done";

export type TaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

export interface ApiTask {
  id: number;
  title: string;
  description: string;
  projectId: number;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: number;
  dueDate: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

function normalizeDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(
    value.length === 10
      ? `${value}T00:00:00.000Z`
      : value
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date.toISOString();
}

export async function getTasks() {
  return api.get<ApiTask[]>("/api/tasks");
}

export async function getTask(id: number) {
  return api.get<ApiTask>(`/api/tasks/${id}`);
}

export async function createTask(data: CreateTaskInput) {
  return api.post<ApiTask>("/api/tasks", {
    ...data,
    dueDate: normalizeDate(data.dueDate),
  });
}

export async function updateTask(
  id: number,
  data: UpdateTaskInput
) {
  return api.patch<ApiTask>(`/api/tasks/${id}`, {
    ...data,
    dueDate: normalizeDate(data.dueDate),
  });
}

export async function deleteTask(id: number) {
  return api.delete(`/api/tasks/${id}`);
}