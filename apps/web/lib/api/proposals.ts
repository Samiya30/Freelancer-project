import { api } from "./http";

export type ProposalStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Rejected"
  | "Expired";

export interface ApiProposal {
  id: number;
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status: ProposalStatus;
  issueDate: string;
  validUntil: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  // Real database relationship.
  clientId: number | null;

  // Returned by the backend when the relation is included.
  clientRecord?: {
    id: number;
    name: string;
    email: string;
    company: string;
  } | null;
}

export interface CreateProposalInput {
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status?: ProposalStatus;
  issueDate?: string;
  validUntil?: string;
  description?: string;

  // Real Client relation.
  clientId?: number | null;
}

export type UpdateProposalInput = Partial<CreateProposalInput>;

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

export async function getProposals() {
  return api.get<ApiProposal[]>("/api/proposals");
}

export async function getProposal(id: number) {
  return api.get<ApiProposal>(`/api/proposals/${id}`);
}

export async function createProposal(data: CreateProposalInput) {
  return api.post<ApiProposal>("/api/proposals", {
    ...data,
    issueDate: normalizeDate(data.issueDate),
    validUntil: normalizeDate(data.validUntil),
  });
}

export async function updateProposal(
  id: number,
  data: UpdateProposalInput
) {
  return api.patch<ApiProposal>(`/api/proposals/${id}`, {
    ...data,
    issueDate: normalizeDate(data.issueDate),
    validUntil: normalizeDate(data.validUntil),
  });
}

export async function deleteProposal(id: number) {
  return api.delete(`/api/proposals/${id}`);
}