"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  DollarSign,
  Mail,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import ClientModal, {
  Client,
} from "@/components/clients/ClientModal";
import { useToast } from "@/components/ui/ToastProvider";

const initialClients: Client[] = [
  {
    id: 1,
    name: "Urban Threads",
    contact: "Aarav Mehta",
    email: "aarav@urbanthreads.com",
    phone: "+91 98765 10101",
    projects: 3,
    revenue: "₹4,85,000",
    outstanding: "₹48,000",
    status: "Active",
    initials: "UT",
  },
  {
    id: 2,
    name: "Nova Studio",
    contact: "Priya Mehta",
    email: "priya@novastudio.com",
    phone: "+91 98765 20202",
    projects: 2,
    revenue: "₹2,75,000",
    outstanding: "₹32,000",
    status: "Active",
    initials: "NS",
  },
  {
    id: 3,
    name: "Acme Technologies",
    contact: "Arjun Kapoor",
    email: "arjun@acme.com",
    phone: "+91 98765 30303",
    projects: 1,
    revenue: "₹1,95,000",
    outstanding: "₹25,000",
    status: "Active",
    initials: "AT",
  },
  {
    id: 4,
    name: "GreenTech",
    contact: "Ananya Singh",
    email: "ananya@greentech.com",
    phone: "+91 98765 40404",
    projects: 2,
    revenue: "₹3,20,000",
    outstanding: "₹0",
    status: "Active",
    initials: "GT",
  },
  {
    id: 5,
    name: "Pixel Works",
    contact: "Vikram Patel",
    email: "vikram@pixelworks.com",
    phone: "+91 98765 50505",
    projects: 1,
    revenue: "₹95,000",
    outstanding: "₹0",
    status: "Inactive",
    initials: "PW",
  },
];

const logoStyles = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

function parseMoney(value: string) {
  return Number(value.replace(/[₹,\s]/g, "")) || 0;
}

export default function ClientsPage() {
  const { showToast } = useToast();

  const [clients, setClients] =
    useState<Client[]>(initialClients);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"All" | "Active" | "Inactive">("All");

  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name"
  >("newest");

  const [createOpen, setCreateOpen] = useState(false);

  const [deleteClient, setDeleteClient] =
    useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    const query = search.toLowerCase().trim();

    const result = clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.name.toLowerCase().includes(query) ||
        client.contact.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      return sortBy === "newest"
        ? b.id - a.id
        : a.id - b.id;
    });
  }, [clients, search, statusFilter, sortBy]);

  const totalRevenue = clients.reduce(
    (total, client) =>
      total + parseMoney(client.revenue),
    0,
  );

  const totalOutstanding = clients.reduce(
    (total, client) =>
      total + parseMoney(client.outstanding),
    0,
  );

  const activeClients = clients.filter(
    (client) => client.status === "Active",
  ).length;

  const totalProjects = clients.reduce(
    (total, client) => total + client.projects,
    0,
  );

  const handleAddClient = (client: Client) => {
    setClients((current) => [client, ...current]);
    setCreateOpen(false);

    showToast(
      "Client added successfully.",
      "success",
    );
  };

  const handleDeleteClient = () => {
    if (!deleteClient) return;

    setClients((current) =>
      current.filter(
        (client) => client.id !== deleteClient.id,
      ),
    );

    showToast(
      `${deleteClient.name} deleted successfully.`,
      "success",
    );

    setDeleteClient(null);
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          {/* Header */}
          <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100">
                  <Users
                    size={18}
                    className="text-purple-600"
                  />
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                  Client CRM
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Clients
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage relationships, projects, revenue and outstanding
                payments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Plus size={17} />
              Add Client
            </button>
          </div>

          {/* Stats */}
          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Revenue
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    ₹{totalRevenue.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                  <DollarSign
                    size={20}
                    className="text-blue-600"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-blue-600">
                Revenue generated from clients
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Outstanding
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    ₹{totalOutstanding.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                  <DollarSign
                    size={20}
                    className="text-orange-600"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-orange-600">
                Pending client payments
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Active Clients
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {activeClients}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
                  <Users
                    size={20}
                    className="text-purple-600"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-purple-600">
                Currently working with you
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Client Projects
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {totalProjects}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Building2
                    size={20}
                    className="text-emerald-600"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-emerald-600">
                Projects across all clients
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-lg">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search clients, contacts or email..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <SlidersHorizontal
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "All"
                        | "Active"
                        | "Inactive",
                    )
                  }
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as
                        | "newest"
                        | "oldest"
                        | "name",
                    )
                  }
                  className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name A-Z</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Client grid */}
          {filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Users
                  size={25}
                  className="text-slate-400"
                />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No clients found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((client, index) => (
                <div
                  key={client.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Card header */}
                  <div className="relative overflow-hidden p-5">
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-purple-50 to-blue-50" />

                    <div className="relative flex items-start justify-between gap-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex min-w-0 items-center gap-3"
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ${
                            logoStyles[
                              index % logoStyles.length
                            ]
                          }`}
                        >
                          {client.initials}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900 group-hover:text-purple-700">
                            {client.name}
                          </h2>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {client.contact}
                          </p>
                        </div>
                      </Link>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          client.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>

                    {/* Contact buttons */}
                    <div className="relative mt-5 flex gap-2">
                      <a
                        href={`mailto:${client.email}`}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Mail size={14} />
                        Email
                      </a>

                      <a
                        href={`tel:${client.phone}`}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/70">
                    <div className="p-4 text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {client.projects}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Projects
                      </p>
                    </div>

                    <div className="border-x border-slate-100 p-4 text-center">
                      <p className="text-sm font-bold text-emerald-600">
                        {client.revenue}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Revenue
                      </p>
                    </div>

                    <div className="p-4 text-center">
                      <p
                        className={`text-sm font-bold ${
                          parseMoney(
                            client.outstanding,
                          ) > 0
                            ? "text-orange-600"
                            : "text-slate-700"
                        }`}
                      >
                        {client.outstanding}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Outstanding
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between p-4">
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-purple-700"
                    >
                      View Client
                      <ArrowUpRight size={14} />
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteClient(client)
                      }
                      className="rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete client"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add client modal */}
      {createOpen && (
        <ClientModal
          onClose={() => setCreateOpen(false)}
          onAdd={handleAddClient}
        />
      )}

      {/* Delete modal */}
      {deleteClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <Trash2
                size={21}
                className="text-red-600"
              />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Delete client?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {deleteClient.name}
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteClient(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteClient}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}