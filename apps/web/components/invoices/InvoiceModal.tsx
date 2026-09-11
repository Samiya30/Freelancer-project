"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: number;
  number: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  description: string;
  items: InvoiceItem[];
  tax: number;
  discount: number;
}

interface InvoiceModalProps {
  clients: {
    id: number;
    name: string;
    email: string;
  }[];

  projects: {
    id: number;
    name: string;
  }[];

  onClose: () => void;
  onAdd: (invoice: Invoice) => void;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();

  const randomNumber = Math.floor(
    100 + Math.random() * 900
  );

  return `INV-${year}-${randomNumber}`;
}

export default function InvoiceModal({
  clients,
  projects,
  onClose,
  onAdd,
}: InvoiceModalProps) {
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [issueDate, setIssueDate] =
    useState(getToday());

  const [dueDate, setDueDate] = useState("");

  const [status, setStatus] =
    useState<InvoiceStatus>("Draft");

  const [description, setDescription] =
    useState("");

  const [tax, setTax] = useState("0");
  const [discount, setDiscount] = useState("0");

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: Date.now(),
      description: "",
      quantity: 1,
      rate: 0,
    },
  ]);

  const [error, setError] = useState("");

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + item.quantity * item.rate,
      0
    );
  }, [items]);

  const taxAmount =
    subtotal * ((Number(tax) || 0) / 100);

  const discountAmount =
    subtotal * ((Number(discount) || 0) / 100);

  const total = Math.max(
    0,
    subtotal + taxAmount - discountAmount
  );

  const updateItem = (
    id: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: Date.now() + current.length,
        description: "",
        quantity: 1,
        rate: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!issueDate) {
      setError("Issue date is required.");
      return;
    }

    if (!dueDate) {
      setError("Due date is required.");
      return;
    }

    if (dueDate < issueDate) {
      setError(
        "Due date cannot be before the issue date."
      );
      return;
    }

    if (Number(tax) < 0 || Number(tax) > 100) {
      setError(
        "Tax must be between 0% and 100%."
      );
      return;
    }

    if (
      Number(discount) < 0 ||
      Number(discount) > 100
    ) {
      setError(
        "Discount must be between 0% and 100%."
      );
      return;
    }

    const hasInvalidItem = items.some(
      (item) =>
        !item.description.trim() ||
        item.quantity <= 0 ||
        item.rate < 0
    );

    if (hasInvalidItem) {
      setError(
        "Please complete all invoice items correctly."
      );
      return;
    }

    if (total <= 0) {
      setError(
        "Invoice total must be greater than zero."
      );
      return;
    }

    const selectedClient = clients.find(
      (client) =>
        client.id === Number(clientId)
    );

    if (!selectedClient) {
      setError(
        "Selected client could not be found."
      );
      return;
    }

    const selectedProject = projects.find(
      (project) =>
        project.id === Number(projectId)
    );

    if (!selectedProject) {
      setError(
        "Selected project could not be found."
      );
      return;
    }

    const invoice: Invoice = {
      id: Date.now(),
      number: generateInvoiceNumber(),
      client: selectedClient.name,
      clientEmail: selectedClient.email,
      project: selectedProject.name,
      amount: total,
      status,
      issueDate,
      dueDate,
      description:
        description.trim() ||
        items
          .map((item) => item.description)
          .join(", "),
      items,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
    };

    onAdd(invoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create Invoice
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a professional invoice for your client.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto"
        >
          <div className="space-y-6 p-6">

            {/* Client + Project */}
            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client
                </label>

                <select
                  value={clientId}
                  onChange={(event) =>
                    setClientId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    Select client
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Project
                </label>

                <select
                  value={projectId}
                  onChange={(event) =>
                    setProjectId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    Select project
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

            </div>

            {/* Dates + Status */}
            <div className="grid gap-5 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Issue Date
                </label>

                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) =>
                    setIssueDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Due Date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as InvoiceStatus
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Sent">
                    Sent
                  </option>

                  <option value="Viewed">
                    Viewed
                  </option>

                  <option value="Paid">
                    Paid
                  </option>
                </select>
              </div>

            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Invoice Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Add a short description..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* Items */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Invoice Items
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Add services or products included in this invoice.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemTotal =
                    item.quantity * item.rate;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid gap-3 lg:grid-cols-[1fr_120px_160px_120px_40px] lg:items-end">

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Description
                          </label>

                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "description",
                                event.target.value
                              )
                            }
                            placeholder={`Service ${index + 1}`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Quantity
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "quantity",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Rate
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "rate",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-600">
                            Total
                          </label>

                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                            ₹
                            {itemTotal.toLocaleString(
                              "en-IN"
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(item.id)
                          }
                          disabled={
                            items.length === 1
                          }
                          className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tax + Discount + Summary */}
            <div className="grid gap-6 lg:grid-cols-2">

              <div className="space-y-4">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tax (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tax}
                    onChange={(event) =>
                      setTax(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Discount (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-3">

                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>

                    <span>
                      ₹
                      {subtotal.toLocaleString(
                        "en-IN"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-600">
                    <span>
                      Tax ({Number(tax) || 0}%)
                    </span>

                    <span>
                      ₹
                      {taxAmount.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits: 0,
                        }
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-600">
                    <span>
                      Discount (
                      {Number(discount) || 0}%)
                    </span>

                    <span>
                      -₹
                      {discountAmount.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits: 0,
                        }
                      )}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">

                      <span className="font-semibold text-slate-900">
                        Total
                      </span>

                      <span className="text-2xl font-bold text-slate-900">
                        ₹
                        {total.toLocaleString(
                          "en-IN",
                          {
                            maximumFractionDigits: 0,
                          }
                        )}
                      </span>

                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Invoice
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}