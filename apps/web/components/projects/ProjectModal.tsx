"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

export type ProjectStatus =
  | "Draft"
  | "Active"
  | "On Hold"
  | "Completed";

export interface Project {
  id: number;
  name: string;
  client: string;
  clientEmail: string;
  description: string;
  value: number;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  dueDate: string;
  createdAt: string;
}

interface ProjectModalProps {
  onClose: () => void;
  onAdd: (project: Project) => void;
}

const statuses: ProjectStatus[] = [
  "Draft",
  "Active",
  "On Hold",
  "Completed",
];

export default function ProjectModal({
  onClose,
  onAdd,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] =
    useState<ProjectStatus>("Active");
  const [progress, setProgress] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!client.trim()) {
      setError("Client name is required.");
      return;
    }

    if (!clientEmail.trim()) {
      setError("Client email is required.");
      return;
    }

    if (!value || Number(value) < 0) {
      setError("Please enter a valid project value.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (!dueDate) {
      setError("Due date is required.");
      return;
    }

    if (new Date(dueDate) < new Date(startDate)) {
      setError("Due date cannot be before the start date.");
      return;
    }

    const numericProgress = Math.min(
      100,
      Math.max(0, Number(progress) || 0)
    );

    const project: Project = {
      id: Date.now(),
      name: name.trim(),
      client: client.trim(),
      clientEmail: clientEmail.trim(),
      description: description.trim(),
      value: Number(value),
      status,
      progress: numericProgress,
      startDate,
      dueDate,
      createdAt: new Date().toISOString().split("T")[0],
    };

    onAdd(project);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create Project
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a new project to your workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Project name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Project Name *
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Website Redesign"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Client */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Client *
              </label>

              <input
                type="text"
                value={client}
                onChange={(event) =>
                  setClient(event.target.value)
                }
                placeholder="Client name"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Client Email *
              </label>

              <input
                type="email"
                value={clientEmail}
                onChange={(event) =>
                  setClientEmail(event.target.value)
                }
                placeholder="client@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Value + status */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Project Value *
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(event) =>
                    setValue(event.target.value)
                  }
                  placeholder="50000"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-8 pr-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as ProjectStatus
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date *
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Due Date *
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Progress
              </label>

              <span className="text-sm font-medium text-slate-600">
                {progress || 0}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) =>
                setProgress(event.target.value)
              }
              className="w-full accent-slate-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              placeholder="Describe the project scope..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}