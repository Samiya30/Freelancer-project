import { api } from "./http";

export type Appearance = "light" | "dark" | "system";

export interface SettingsProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  bio: string;
}

export interface SettingsWorkspace {
  name: string;
  website: string;
  industry: string;
  timezone: string;
  currency: string;
}

export interface SettingsNotifications {
  email: boolean;
  projects: boolean;
  invoices: boolean;
  tasks: boolean;
  weekly: boolean;
  marketing: boolean;
}

export interface SettingsData {
  profile: SettingsProfile;
  workspace: SettingsWorkspace;
  notifications: SettingsNotifications;
  appearance: Appearance;
}

export async function getSettings() {
  return api.get<SettingsData>("/api/settings");
}

export async function updateSettings(data: SettingsData) {
  return api.patch<SettingsData>("/api/settings", data);
}