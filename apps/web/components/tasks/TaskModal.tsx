"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";

export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Review"
  | "Done";

export type TaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

export interface Task {
  id: number;
  title: string;
  description: string;
  projectId: number;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
}

interface TaskModalProps {
  projects: {
    id: number;
    name: string;
  }[];
  onClose: () => void;
  onAdd: (task: Task) => void;
}

const statuses: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
];

const priorities: TaskPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export default function TaskModal({
  projects,
  onClose,
  onAdd,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [projectId, setProjectId] =
    useState("");

  const [status, setStatus] =
    useState<TaskStatus>("To Do");

  const [priority, setPriority] =
    useState<TaskPriority>("Medium");

  const [dueDate, setDueDate] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!dueDate) {
      setError("Due date is required.");
      return;
    }

    const selectedProject = projects.find(
      (project) =>
        project.id === Number(projectId)
    );

    if (!selectedProject) {
      setError("Selected project could not be found.");
      return;
    }

    const task: Task = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      status,
      priority,
      dueDate,
      createdAt: new Date()
        .toISOString()
        .split("T")[0],
    };

    onAdd(task);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create Task
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a task and assign it to a project.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Task Title *
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Design homepage"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Project */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Project *
            </label>

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">
                Select a project
              </option>

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

          {/* Status + Priority */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as TaskStatus
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Priority
              </label>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as TaskPriority
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
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
              placeholder="Describe what needs to be done..."
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}