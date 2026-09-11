"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface Client {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  projects: number;
  revenue: string;
  outstanding: string;
  status: "Active" | "Inactive";
  initials: string;
}

interface EditClientModalProps {
  client: Client;
  onClose: () => void;
  onSave: (updatedClient: Client) => void;
}

export default function EditClientModal({
  client,
  onClose,
  onSave,
}: EditClientModalProps) {
  const [form, setForm] = useState({
    name: client.name,
    contact: client.contact,
    email: client.email,
    phone: client.phone,
    status: client.status,
  });

  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Client name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    const initials =
      form.name
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || client.initials;

    const updatedClient: Client = {
      ...client,
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      initials,
    };

    onSave(updatedClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Edit Client
            </h2>

            <p className="text-sm text-slate-500">
              Update client information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Client Name */}
          <div>
            <label
              htmlFor="client-name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Client Name
            </label>

            <input
              id="client-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter client name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label
              htmlFor="contact-person"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Contact Person
            </label>

            <input
              id="contact-person"
              type="text"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="Enter contact person"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="client-email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="client-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="client@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="client-phone"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Phone
            </label>

            <input
              id="client-phone"
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="client-status"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Status
            </label>

            <select
              id="client-status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}