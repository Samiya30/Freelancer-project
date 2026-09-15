import { api } from "./http";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export type FileType =
  | "PDF"
  | "DOC"
  | "XLS"
  | "IMAGE"
  | "ZIP"
  | "CODE"
  | "OTHER";

export interface ApiFile {
  id: number;
  name: string;
  type: FileType;
  size: number;
  storagePath: string;
  folder: string;
  shared: boolean;
  client: string | null;
  project: string | null;
  clientId: number | null;
  projectId: number | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileInput {
  name: string;
  type: FileType;
  size: number;
  storagePath: string;
  folder: string;
  shared?: boolean;
  client?: string | null;
  project?: string | null;
  clientId?: number | null;
  projectId?: number | null;
}

export interface UploadFileInput {
  file: globalThis.File;
  folder: string;
  shared?: boolean;
  client?: string | null;
  project?: string | null;
  clientId?: number | null;
  projectId?: number | null;
}

export type UpdateFileInput = Partial<CreateFileInput>;

export async function getFiles() {
  return api.get<ApiFile[]>("/api/files");
}

export async function getFile(id: number) {
  return api.get<ApiFile>(`/api/files/${id}`);
}

/**
 * Upload the actual binary file.
 *
 * FormData is passed through the shared HTTP helper.
 * The helper intentionally does not set Content-Type for
 * FormData so the browser can generate the multipart boundary.
 */
export async function uploadFile(data: UploadFileInput) {
  const formData = new FormData();

  formData.append("file", data.file);
  formData.append("folder", data.folder);
  formData.append("shared", String(data.shared ?? false));

  if (data.client !== undefined) {
    formData.append("client", data.client ?? "");
  }

  if (data.project !== undefined) {
    formData.append("project", data.project ?? "");
  }

  if (data.clientId !== undefined) {
    formData.append(
      "clientId",
      data.clientId === null ? "" : String(data.clientId),
    );
  }

  if (data.projectId !== undefined) {
    formData.append(
      "projectId",
      data.projectId === null ? "" : String(data.projectId),
    );
  }

  return api.post<ApiFile>("/api/files/upload", formData);
}

export async function createFile(data: CreateFileInput) {
  return api.post<ApiFile>("/api/files", data);
}

export async function updateFile(
  id: number,
  data: UpdateFileInput,
) {
  return api.patch<ApiFile>(`/api/files/${id}`, data);
}

export async function deleteFile(id: number) {
  return api.delete(`/api/files/${id}`);
}

/**
 * Duplicate the actual stored file.
 */
export async function duplicateFile(id: number) {
  return api.post<ApiFile>(
    `/api/files/${id}/duplicate`,
    {},
  );
}

/**
 * Download the actual stored binary.
 */
export async function downloadFile(
  id: number,
  filename: string,
) {
  const response = await fetch(
    `${API_URL}/api/files/${id}/download`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    let message =
      `Download failed with status ${response.status}`;

    try {
      const body = await response.json();

      if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const objectUrl =
    window.URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(objectUrl);
}