"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Globe,
  Lock,
  Moon,
  Palette,
  Save,
  Shield,
  Sparkles,
  Sun,
  User,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Smartphone,
  Monitor,
  AlertTriangle,
  LogOut,
  Camera,
  Upload,
  CheckCircle2,
} from "lucide-react";

import {
  getSettings,
  updateSettings,
  type Appearance,
  type SettingsData,
} from "@/lib/api/settings";

type Section =
  | "profile"
  | "workspace"
  | "notifications"
  | "billing"
  | "security"
  | "appearance";

const sections: {
  id: Section;
  label: string;
  icon: typeof User;
  description: string;
}[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Personal information",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Building2,
    description: "Workspace details",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Email preferences",
  },
  {
    id: "billing",
    label: "Billing & Plan",
    icon: CreditCard,
    description: "Plan and billing",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Account security",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Customize your UI",
  },
];

const defaultSettings: SettingsData = {
  profile: {
    firstName: "Samiya",
    lastName: "Sharma",
    email: "Sam@example.com",
    phone: "+91 98765 43210",
    role: "Freelancer",
    bio: "Independent freelancer helping businesses build better digital experiences.",
  },

  workspace: {
    name: "Samiya's Workspace",
    website: "https://example.com",
    industry: "Technology",
    timezone: "Asia/Kolkata",
    currency: "INR (₹)",
  },

  notifications: {
    email: true,
    projects: true,
    invoices: true,
    tasks: true,
    weekly: true,
    marketing: false,
  },

  appearance: "system",
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<Section>("profile");

  const [profile, setProfile] = useState(defaultSettings.profile);
  const [workspace, setWorkspace] =
    useState(defaultSettings.workspace);
  const [notifications, setNotifications] =
    useState(defaultSettings.notifications);
  const [appearance, setAppearance] =
    useState<Appearance>(defaultSettings.appearance);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        setLoadingSettings(true);

        const response = await getSettings();

        if (!response.data || cancelled) {
          return;
        }

        setProfile(response.data.profile);
        setWorkspace(response.data.workspace);
        setNotifications(response.data.notifications);
        setAppearance(response.data.appearance);
      } catch (error) {
        console.error("Failed to load settings:", error);

        if (!cancelled) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load settings."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);

      const payload: SettingsData = {
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          bio: profile.bio,
        },

        workspace: {
          name: workspace.name,
          website: workspace.website,
          industry: workspace.industry,
          timezone: workspace.timezone,
          currency: workspace.currency,
        },

        notifications: {
          email: notifications.email,
          projects: notifications.projects,
          invoices: notifications.invoices,
          tasks: notifications.tasks,
          weekly: notifications.weekly,
          marketing: notifications.marketing,
        },

        appearance,
      };

      const response = await updateSettings(payload);

      if (!response.data) {
        throw new Error(
          "Settings were saved but no data was returned."
        );
      }

      setProfile(response.data.profile);
      setWorkspace(response.data.workspace);
      setNotifications(response.data.notifications);
      setAppearance(response.data.appearance);

      showToast(
        response.message ||
          "Your settings have been updated successfully."
      );
    } catch (error) {
      console.error("Failed to save settings:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options?: {
      placeholder?: string;
      type?: string;
      icon?: typeof User;
      disabled?: boolean;
    }
  ) => {
    const Icon = options?.icon;

    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          {label}
        </label>

        <div className="relative">
          {Icon && (
            <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}

          <input
            type={options?.type || "text"}
            value={value}
            disabled={options?.disabled}
            placeholder={options?.placeholder}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 ${
              Icon ? "pl-11" : ""
            } ${
              options?.disabled
                ? "cursor-not-allowed bg-slate-50 text-slate-500"
                : ""
            }`}
          />
        </div>
      </div>
    );
  };

  const renderToggle = (
    title: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void
  ) => {
    return (
      <div className="flex items-center justify-between gap-6 rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-violet-100 hover:shadow-sm">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Bell className="h-5 w-5" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">
              {title}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(!value)}
          aria-pressed={value}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            value ? "bg-violet-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              value ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Profile
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and freelancer profile.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600" />

        <div className="px-6 pb-6">
          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl font-bold text-white shadow-xl">
                {profile.firstName?.charAt(0)}
                {profile.lastName?.charAt(0)}
              </div>

              <div className="pb-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {profile.firstName} {profile.lastName}
                </h3>

                <p className="text-sm text-slate-500">
                  {profile.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              <Camera className="h-4 w-4" />
              Change photo
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="font-bold text-slate-900">
            Personal information
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            This information is used across your FreelanceOS
            workspace.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {renderInput(
            "First name",
            profile.firstName,
            (value) =>
              setProfile((current) => ({
                ...current,
                firstName: value,
              })),
            { icon: User }
          )}

          {renderInput(
            "Last name",
            profile.lastName,
            (value) =>
              setProfile((current) => ({
                ...current,
                lastName: value,
              })),
            { icon: User }
          )}

          {renderInput(
            "Email address",
            profile.email,
            (value) =>
              setProfile((current) => ({
                ...current,
                email: value,
              })),
            {
              icon: Mail,
              type: "email",
            }
          )}

          {renderInput(
            "Phone number",
            profile.phone,
            (value) =>
              setProfile((current) => ({
                ...current,
                phone: value,
              })),
            { icon: Phone }
          )}

          {renderInput(
            "Role",
            profile.role,
            (value) =>
              setProfile((current) => ({
                ...current,
                role: value,
              })),
            { icon: Briefcase }
          )}
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Bio
          </label>

          <textarea
            value={profile.bio}
            rows={5}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                bio: event.target.value,
              }))
            }
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            placeholder="Tell clients about yourself..."
          />
        </div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Workspace
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure your workspace identity and regional
          preferences.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Workspace branding
            </h3>

            <p className="text-sm text-slate-500">
              Set the details clients see across your workspace.
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-5 rounded-2xl bg-slate-50 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-bold text-violet-600 shadow-sm">
            {workspace.name?.charAt(0)}
          </div>

          <div className="flex-1">
            <p className="font-semibold text-slate-900">
              Workspace logo
            </p>

            <p className="mt-1 text-sm text-slate-500">
              JPG, PNG or SVG. Recommended size 256×256.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {renderInput(
            "Workspace name",
            workspace.name,
            (value) =>
              setWorkspace((current) => ({
                ...current,
                name: value,
              })),
            { icon: Building2 }
          )}

          {renderInput(
            "Website",
            workspace.website,
            (value) =>
              setWorkspace((current) => ({
                ...current,
                website: value,
              })),
            { icon: Globe, type: "url" }
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Industry
            </label>

            <select
              value={workspace.industry}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  industry: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            >
              <option>Technology</option>
              <option>Design</option>
              <option>Marketing</option>
              <option>Consulting</option>
              <option>Finance</option>
              <option>Education</option>
              <option>Healthcare</option>
              <option>Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Timezone
            </label>

            <select
              value={workspace.timezone}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            >
              <option value="Asia/Kolkata">
                Asia/Kolkata
              </option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Europe/London">
                Europe/London
              </option>
              <option value="Europe/Paris">
                Europe/Paris
              </option>
              <option value="America/New_York">
                America/New_York
              </option>
              <option value="America/Los_Angeles">
                America/Los_Angeles
              </option>
              <option value="Australia/Sydney">
                Australia/Sydney
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Currency
            </label>

            <select
              value={workspace.currency}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            >
              <option>INR (₹)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>AED (د.إ)</option>
              <option>CAD ($)</option>
              <option>AUD ($)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Notifications
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Choose which updates and reminders you want to receive.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Bell className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Notification preferences
            </h3>

            <p className="text-sm text-slate-500">
              Control what FreelanceOS sends you.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {renderToggle(
            "Email notifications",
            "Receive important account and workspace updates by email.",
            notifications.email,
            (value) =>
              setNotifications((current) => ({
                ...current,
                email: value,
              }))
          )}

          {renderToggle(
            "Project updates",
            "Get notified when project status or milestones change.",
            notifications.projects,
            (value) =>
              setNotifications((current) => ({
                ...current,
                projects: value,
              }))
          )}

          {renderToggle(
            "Invoice notifications",
            "Receive alerts about invoices, payments and overdue invoices.",
            notifications.invoices,
            (value) =>
              setNotifications((current) => ({
                ...current,
                invoices: value,
              }))
          )}

          {renderToggle(
            "Task reminders",
            "Receive reminders about upcoming and overdue tasks.",
            notifications.tasks,
            (value) =>
              setNotifications((current) => ({
                ...current,
                tasks: value,
              }))
          )}

          {renderToggle(
            "Weekly summary",
            "Receive a weekly overview of your freelance business.",
            notifications.weekly,
            (value) =>
              setNotifications((current) => ({
                ...current,
                weekly: value,
              }))
          )}

          {renderToggle(
            "Marketing emails",
            "Receive product updates, tips and occasional offers.",
            notifications.marketing,
            (value) =>
              setNotifications((current) => ({
                ...current,
                marketing: value,
              }))
          )}
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Billing & Plan
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage your FreelanceOS subscription and billing.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-7 text-white shadow-xl shadow-violet-500/20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Current plan
            </div>

            <h3 className="text-3xl font-black">
              Free
            </h3>

            <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
              Start managing your freelance business with the
              essential FreelanceOS tools.
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-lg transition hover:bg-violet-50"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-slate-900">
          Pro includes
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            "Unlimited clients",
            "Unlimited projects",
            "Advanced reports",
            "Priority support",
            "Automated workflows",
            "Advanced invoicing",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-4 w-4" />
              </div>

              <span className="text-sm font-medium text-slate-700">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Security
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Keep your FreelanceOS account secure.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h3 className="font-bold text-slate-900">
            Account security
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Review your password and authentication settings.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between gap-5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Lock className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Password
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Last changed recently
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-between gap-5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Two-factor authentication
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add an extra layer of account protection.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Enable
            </button>
          </div>

          <div className="flex items-center justify-between gap-5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Smartphone className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Active sessions
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Review devices currently signed into your account.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Review
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-red-900">
              Danger zone
            </h3>

            <p className="mt-1 text-sm leading-6 text-red-700/80">
              Permanently delete your workspace and all associated
              data. This action cannot be undone.
            </p>

            <button
              type="button"
              className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              Delete workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Appearance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Customize how FreelanceOS looks on your devices.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-slate-900">
          Theme
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Select the appearance you prefer.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              value: "light" as const,
              label: "Light",
              description: "Always use light mode",
              icon: Sun,
            },
            {
              value: "dark" as const,
              label: "Dark",
              description: "Always use dark mode",
              icon: Moon,
            },
            {
              value: "system" as const,
              label: "System",
              description: "Follow your device",
              icon: Monitor,
            },
          ].map((option) => {
            const Icon = option.icon;
            const selected = appearance === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAppearance(option.value)}
                className={`relative rounded-2xl border-2 p-5 text-left transition ${
                  selected
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
                }`}
              >
                {selected && (
                  <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p className="font-bold text-slate-900">
                  {option.label}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfile();

      case "workspace":
        return renderWorkspace();

      case "notifications":
        return renderNotifications();

      case "billing":
        return renderBilling();

      case "security":
        return renderSecurity();

      case "appearance":
        return renderAppearance();

      default:
        return renderProfile();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-2xl">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            {toast}
          </p>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Workspace settings
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
                Manage your profile, workspace preferences,
                notifications and account configuration.
              </p>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || loadingSettings}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-xl transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />

              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Account
              </p>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(section.id)
                    }
                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                          : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {section.label}
                      </p>

                      <p
                        className={`mt-0.5 truncate text-xs ${
                          active
                            ? "text-violet-500"
                            : "text-slate-400"
                        }`}
                      >
                        {section.description}
                      </p>
                    </div>

                    <ChevronRight
                      className={`h-4 w-4 transition ${
                        active
                          ? "text-violet-500"
                          : "text-slate-300 group-hover:text-slate-500"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {/* Upgrade card */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Sparkles className="h-5 w-5" />
              </div>

              <p className="font-bold">
                Unlock Pro
              </p>

              <p className="mt-1 text-xs leading-5 text-white/70">
                Get advanced reports, automation and unlimited
                business tools.
              </p>

              <button
                type="button"
                onClick={() =>
                  setActiveSection("billing")
                }
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold backdrop-blur transition hover:bg-white/20"
              >
                View plan
              </button>
            </div>
          </aside>

          {/* Content */}
          <section className="min-w-0">
            {loadingSettings ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <SettingsIcon />
                  </div>

                  <h3 className="mt-5 font-bold text-slate-900">
                    Loading settings...
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Fetching your saved workspace configuration.
                  </p>
                </div>
              </div>
            ) : (
              renderSection()
            )}

            {/* Bottom save */}
            {!loadingSettings && (
              <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Your changes are saved securely
                    </p>

                    <p className="text-xs text-slate-500">
                      Changes are stored in your FreelanceOS
                      workspace.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6.6v-2.4h.24A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.2A1.7 1.7 0 0 0 16.1 5.76a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.03h.24v2.4h-.24A1.7 1.7 0 0 0 19.4 15Z"
      />
    </svg>
  );
}