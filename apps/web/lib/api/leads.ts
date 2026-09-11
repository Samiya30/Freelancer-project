import { api } from "./http";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Won"
  | "Lost";

export type LeadSource =
  | "Website"
  | "LinkedIn"
  | "Referral"
  | "Instagram"
  | "Facebook"
  | "Cold Email"
  | "Other";

export interface ApiLead {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  source: LeadSource;
  value: number;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  company: string;
  phone?: string;
  source: LeadSource;
  value: number;
  status?: LeadStatus;
}

export type UpdateLeadInput =
  Partial<CreateLeadInput>;

export async function getLeads() {
  return api.get<ApiLead[]>("/api/leads");
}

export async function getLead(id: number) {
  return api.get<ApiLead>(
    `/api/leads/${id}`
  );
}

export async function createLead(
  data: CreateLeadInput
) {
  return api.post<ApiLead>(
    "/api/leads",
    data
  );
}

export async function updateLead(
  id: number,
  data: UpdateLeadInput
) {
  return api.patch<ApiLead>(
    `/api/leads/${id}`,
    data
  );
}

export async function deleteLead(
  id: number
) {
  return api.delete(
    `/api/leads/${id}`
  );
}