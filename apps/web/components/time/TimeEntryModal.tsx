"use client";

import { FormEvent, useState } from "react";
import { Clock3, X } from "lucide-react";

export interface TimeEntry {
  id: number;
  description: string;
  projectId: number;
  projectName: string;
  taskId?: number;
  taskName?: string;
  date: string;
  duration: number;
  billable: boolean;
  hourlyRate: number;
}

interface TimeEntryModalProps {
  projects: {
    id: number;
    name: string;
  }[];
  onClose: () => void;
  onAdd: (entry: TimeEntry) => void;
}

export default function TimeEntryModal({
  projects,
  onClose,
  onAdd,
}: TimeEntryModalProps) {
  const [description, setDescription] = useState("");

  const [projectId, setProjectId] = useState(
    projects[0]?.id?.toString() ?? ""
  );

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");

  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState("1500");

  const [error, setError] = useState("");

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!description.trim()) {
      setError("Please enter what you worked on.");
      return;
    }

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    const parsedHours = Number(hours) || 0;
    const parsedMinutes = Number(minutes) || 0;

    if (
      parsedHours < 0 ||
      parsedMinutes < 0 ||
      parsedMinutes > 59
    ) {
      setError("Please enter a valid duration.");
      return;
    }

    const duration =
      parsedHours * 60 + parsedMinutes;

    if (duration <= 0) {
      setError("Duration must be greater than zero.");
      return;
    }

    const project = projects.find(
      (item) => item.id === Number(projectId)
    );

    if (!project) {
      setError("Please select a valid project.");
      return;
    }

    onAdd({
      id: Date.now(),
      description: description.trim(),
      projectId: project.id,
      projectName: project.name,
      date,
      duration,
      billable,
      hourlyRate: billable
        ? Number(hourlyRate) || 0
        : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Add time entry
              </h2>

              <p className="text-xs text-slate-500">
                Record work completed on a project.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              What did you work on?
            </label>

            <input
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="e.g. Designed homepage sections"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Project
            </label>

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Duration
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(event) =>
                    setHours(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none focus:border-blue-400"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  hours
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(event) =>
                    setMinutes(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none focus:border-blue-400"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  minutes
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Billable time
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Include this time in billable work.
                </p>
              </div>

              <input
                type="checkbox"
                checked={billable}
                onChange={(event) =>
                  setBillable(event.target.checked)
                }
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {billable && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Hourly rate
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(event) =>
                    setHourlyRate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add time
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}