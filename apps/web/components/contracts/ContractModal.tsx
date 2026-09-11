"use client";

import { FormEvent, useState } from "react";
import { FileSignature, X } from "lucide-react";

export type ContractStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Signed"
  | "Declined"
  | "Expired";

export interface Contract {
  id: number;
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  value: number;
  status: ContractStatus;
  createdAt: string;
  expiresAt: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  scope: string;
  additionalTerms: string;
}

interface ContractModalProps {
  onClose: () => void;
  onAdd: (contract: Contract) => void;
}

export default function ContractModal({
  onClose,
  onAdd,
}: ContractModalProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("50% upfront, 50% on completion");
  const [scope, setScope] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [status, setStatus] = useState<ContractStatus>("Draft");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError("Contract title is required.");
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

    if (!value || Number(value) <= 0) {
      setError("Please enter a valid contract value.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (!endDate) {
      setError("End date is required.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be before the start date.");
      return;
    }

    if (!scope.trim()) {
      setError("Scope of work is required.");
      return;
    }

    const now = new Date();

    const newContract: Contract = {
      id: Date.now(),
      number: `CON-${String(Date.now()).slice(-6)}`,
      title: title.trim(),
      client: client.trim(),
      clientEmail: clientEmail.trim(),
      value: Number(value),
      status,
      createdAt: now.toISOString().split("T")[0],
      expiresAt: endDate,
      startDate,
      endDate,
      paymentTerms: paymentTerms.trim(),
      scope: scope.trim(),
      additionalTerms: additionalTerms.trim(),
    };

    onAdd(newContract);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileSignature className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                New Contract
              </h2>

              <p className="text-sm text-slate-500">
                Create a contract for your client
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Contract title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Contract Title <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Website Development Agreement"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Client information */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Client <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Client Email <span className="text-red-500">*</span>
                </label>

                <input
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Value + status */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contract Value <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="85000"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-8 pr-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ContractStatus)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Signed">Signed</option>
                  <option value="Declined">Declined</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Start Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  End Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Payment terms */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Payment Terms
              </label>

              <input
                type="text"
                value={paymentTerms}
                onChange={(event) => setPaymentTerms(event.target.value)}
                placeholder="e.g. 50% upfront, 50% on completion"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Scope */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Scope of Work <span className="text-red-500">*</span>
              </label>

              <textarea
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                rows={5}
                placeholder="Describe the services, deliverables, responsibilities, milestones, etc."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Additional terms */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Additional Terms
              </label>

              <textarea
                value={additionalTerms}
                onChange={(event) => setAdditionalTerms(event.target.value)}
                rows={4}
                placeholder="Add confidentiality, revisions, cancellation, intellectual property, or other terms..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Contract
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}