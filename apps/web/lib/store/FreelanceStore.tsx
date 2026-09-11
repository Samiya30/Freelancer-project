"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* =========================================================
   TYPES
========================================================= */

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Won"
  | "Lost";

export type TaskStatus = "To Do" | "In Progress" | "Review" | "Done";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type PaymentStatus = "Completed" | "Pending" | "Failed";

export type PaymentMethod =
  | "UPI"
  | "Bank Transfer"
  | "Card"
  | "Cash";

export type ExpenseCategory =
  | "Software"
  | "Marketing"
  | "Travel"
  | "Office"
  | "Equipment"
  | "Utilities"
  | "Other";

export type ExpenseStatus = "Paid" | "Pending";

export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "Review"
  | "Completed"
  | "On Hold";

export type ProposalStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Rejected"
  | "Expired";

export type ContractStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Signed"
  | "Expired"
  | "Cancelled";

/* =========================================================
   CLIENT
========================================================= */

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "Active" | "Inactive";
  projects: number;
  totalRevenue: number;
  createdAt: string;
}

/* =========================================================
   LEAD
========================================================= */

export interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string;
  source: string;
  value: number;
  status: LeadStatus;
  createdAt: string;
}

/* =========================================================
   PROPOSAL
========================================================= */

export interface Proposal {
  id: number;
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  amount: number;
  status: ProposalStatus;
  issueDate: string;
  validUntil: string;
  description: string;
}

/* =========================================================
   CONTRACT
========================================================= */

export interface Contract {
  id: number;
  number: string;
  title: string;
  client: string;
  clientEmail: string;
  project: string;
  value: number;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  description: string;
}

/* =========================================================
   PROJECT
========================================================= */

export interface Project {
  id: number;
  name: string;
  client: string;
  clientEmail: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  budget: number;
  progress: number;
}

/* =========================================================
   TASK
========================================================= */

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

/* =========================================================
   TIME ENTRY
========================================================= */

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

/* =========================================================
   INVOICE
========================================================= */

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

/* =========================================================
   PAYMENT
========================================================= */

export interface Payment {
  id: number;
  paymentNumber: string;
  clientName: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
}

/* =========================================================
   EXPENSE
========================================================= */

export interface Expense {
  id: number;
  title: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  status: ExpenseStatus;
  project?: string;
  vendor?: string;
}

/* =========================================================
   STORE TYPE
========================================================= */

interface FreelanceStoreValue {
  clients: Client[];
  leads: Lead[];
  proposals: Proposal[];
  contracts: Contract[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];

  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: number) => void;

  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (id: number) => void;

  addProposal: (proposal: Proposal) => void;
  updateProposal: (proposal: Proposal) => void;
  deleteProposal: (id: number) => void;

  addContract: (contract: Contract) => void;
  updateContract: (contract: Contract) => void;
  deleteContract: (id: number) => void;

  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: number) => void;

  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: number) => void;

  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (entry: TimeEntry) => void;
  deleteTimeEntry: (id: number) => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: number) => void;

  addPayment: (payment: Payment) => void;
  updatePayment: (payment: Payment) => void;
  deletePayment: (id: number) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: number) => void;

  resetDemoData: () => void;
}

/* =========================================================
   DEMO DATA
========================================================= */

const initialClients: Client[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@acme.com",
    phone: "+91 98765 43210",
    company: "Acme Corporation",
    status: "Active",
    projects: 3,
    totalRevenue: 285000,
    createdAt: "2026-01-12",
  },
  {
    id: 2,
    name: "Ananya Mehta",
    email: "ananya@novalabs.com",
    phone: "+91 99887 66554",
    company: "Nova Labs",
    status: "Active",
    projects: 2,
    totalRevenue: 172000,
    createdAt: "2026-02-18",
  },
  {
    id: 3,
    name: "Arjun Kapoor",
    email: "arjun@brightstudio.com",
    phone: "+91 98111 22334",
    company: "Bright Studio",
    status: "Active",
    projects: 1,
    totalRevenue: 95000,
    createdAt: "2026-03-04",
  },
  {
    id: 4,
    name: "Priya Verma",
    email: "priya@vertex.com",
    phone: "+91 98989 77665",
    company: "Vertex Technologies",
    status: "Active",
    projects: 2,
    totalRevenue: 310000,
    createdAt: "2026-04-10",
  },
  {
    id: 5,
    name: "Karan Malhotra",
    email: "karan@pixelhouse.com",
    phone: "+91 97777 44556",
    company: "Pixel House",
    status: "Inactive",
    projects: 1,
    totalRevenue: 58000,
    createdAt: "2026-05-22",
  },
];

const initialLeads: Lead[] = [
  {
    id: 1,
    name: "Neha Gupta",
    email: "neha@startup.io",
    company: "Startup IO",
    phone: "+91 98765 11223",
    source: "Website",
    value: 120000,
    status: "Qualified",
    createdAt: "2026-08-20",
  },
  {
    id: 2,
    name: "Vikram Singh",
    email: "vikram@fintech.co",
    company: "Fintech Co",
    phone: "+91 98123 45678",
    source: "LinkedIn",
    value: 185000,
    status: "Proposal",
    createdAt: "2026-08-22",
  },
  {
    id: 3,
    name: "Isha Jain",
    email: "isha@designhub.in",
    company: "Design Hub",
    phone: "+91 99887 11223",
    source: "Referral",
    value: 75000,
    status: "Contacted",
    createdAt: "2026-08-25",
  },
  {
    id: 4,
    name: "Rohan Patel",
    email: "rohan@ecommerce.com",
    company: "Ecommerce Pro",
    phone: "+91 98770 99881",
    source: "Instagram",
    value: 210000,
    status: "New",
    createdAt: "2026-08-29",
  },
];

const initialProposals: Proposal[] = [
  {
    id: 1,
    number: "PROP-2026-001",
    title: "Website Redesign Proposal",
    client: "Acme Corporation",
    clientEmail: "rahul@acme.com",
    project: "Website Redesign",
    amount: 85000,
    status: "Accepted",
    issueDate: "2026-08-01",
    validUntil: "2026-08-31",
    description: "Complete redesign of the company website.",
  },
  {
    id: 2,
    number: "PROP-2026-002",
    title: "Mobile App UI/UX",
    client: "Nova Labs",
    clientEmail: "ananya@novalabs.com",
    project: "Mobile App UI",
    amount: 62000,
    status: "Sent",
    issueDate: "2026-08-12",
    validUntil: "2026-09-12",
    description: "Mobile application UI/UX design.",
  },
  {
    id: 3,
    number: "PROP-2026-003",
    title: "Brand Identity Package",
    client: "Bright Studio",
    clientEmail: "arjun@brightstudio.com",
    project: "Brand Identity",
    amount: 45000,
    status: "Viewed",
    issueDate: "2026-08-15",
    validUntil: "2026-09-15",
    description: "Complete visual identity package.",
  },
];

const initialContracts: Contract[] = [
  {
    id: 1,
    number: "CON-2026-001",
    title: "Website Development Agreement",
    client: "Acme Corporation",
    clientEmail: "rahul@acme.com",
    project: "Website Redesign",
    value: 85000,
    status: "Signed",
    startDate: "2026-08-01",
    endDate: "2026-10-01",
    description: "Website redesign and development agreement.",
  },
  {
    id: 2,
    number: "CON-2026-002",
    title: "Mobile App Design Agreement",
    client: "Nova Labs",
    clientEmail: "ananya@novalabs.com",
    project: "Mobile App UI",
    value: 62000,
    status: "Sent",
    startDate: "2026-08-15",
    endDate: "2026-10-15",
    description: "UI/UX design services agreement.",
  },
];

const initialProjects: Project[] = [
  {
    id: 1,
    name: "Website Redesign",
    client: "Acme Corporation",
    clientEmail: "rahul@acme.com",
    description: "Complete company website redesign.",
    status: "In Progress",
    startDate: "2026-08-01",
    dueDate: "2026-10-01",
    budget: 85000,
    progress: 82,
  },
  {
    id: 2,
    name: "Mobile App UI",
    client: "Nova Labs",
    clientEmail: "ananya@novalabs.com",
    description: "Mobile application UI/UX design.",
    status: "In Progress",
    startDate: "2026-08-15",
    dueDate: "2026-10-15",
    budget: 62000,
    progress: 68,
  },
  {
    id: 3,
    name: "Brand Identity",
    client: "Bright Studio",
    clientEmail: "arjun@brightstudio.com",
    description: "Brand identity and visual system.",
    status: "Completed",
    startDate: "2026-07-01",
    dueDate: "2026-08-20",
    budget: 45000,
    progress: 100,
  },
  {
    id: 4,
    name: "SaaS Dashboard",
    client: "Vertex Technologies",
    clientEmail: "priya@vertex.com",
    description: "Business SaaS dashboard.",
    status: "In Progress",
    startDate: "2026-08-10",
    dueDate: "2026-11-10",
    budget: 110000,
    progress: 54,
  },
  {
    id: 5,
    name: "Marketing Website",
    client: "Pixel House",
    clientEmail: "karan@pixelhouse.com",
    description: "Marketing website development.",
    status: "Completed",
    startDate: "2026-07-10",
    dueDate: "2026-08-30",
    budget: 38000,
    progress: 100,
  },
];

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Finalize homepage design",
    description: "Complete final homepage desktop and mobile designs.",
    projectId: 1,
    projectName: "Website Redesign",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-09-08",
    createdAt: "2026-08-25",
  },
  {
    id: 2,
    title: "Create responsive layouts",
    description: "Convert approved designs into responsive layouts.",
    projectId: 1,
    projectName: "Website Redesign",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-09-12",
    createdAt: "2026-08-27",
  },
  {
    id: 3,
    title: "Prepare onboarding screens",
    description: "Design onboarding flow for the mobile application.",
    projectId: 2,
    projectName: "Mobile App UI",
    status: "Review",
    priority: "High",
    dueDate: "2026-09-07",
    createdAt: "2026-08-20",
  },
  {
    id: 4,
    title: "Client feedback revisions",
    description: "Apply requested revisions.",
    projectId: 2,
    projectName: "Mobile App UI",
    status: "Done",
    priority: "Medium",
    dueDate: "2026-09-01",
    createdAt: "2026-08-18",
  },
  {
    id: 5,
    title: "Create logo variations",
    description: "Prepare final logo variations.",
    projectId: 3,
    projectName: "Brand Identity",
    status: "Done",
    priority: "Low",
    dueDate: "2026-08-10",
    createdAt: "2026-07-20",
  },
];

const initialTimeEntries: TimeEntry[] = [
  {
    id: 1,
    description: "Homepage UI design",
    projectId: 1,
    projectName: "Website Redesign",
    taskId: 1,
    taskName: "Finalize homepage design",
    date: "2026-09-01",
    duration: 150,
    billable: true,
    hourlyRate: 1500,
  },
  {
    id: 2,
    description: "Responsive layout work",
    projectId: 1,
    projectName: "Website Redesign",
    taskId: 2,
    taskName: "Create responsive layouts",
    date: "2026-09-02",
    duration: 210,
    billable: true,
    hourlyRate: 1500,
  },
  {
    id: 3,
    description: "Mobile onboarding screens",
    projectId: 2,
    projectName: "Mobile App UI",
    taskId: 3,
    taskName: "Prepare onboarding screens",
    date: "2026-09-03",
    duration: 180,
    billable: true,
    hourlyRate: 1600,
  },
];

const initialInvoices: Invoice[] = [
  {
    id: 1,
    number: "INV-2026-001",
    client: "Acme Corporation",
    clientEmail: "rahul@acme.com",
    project: "Website Redesign",
    amount: 85000,
    status: "Paid",
    issueDate: "2026-08-01",
    dueDate: "2026-08-30",
    description: "Website redesign project.",
    items: [
      {
        id: 1,
        description: "Website redesign",
        quantity: 1,
        rate: 85000,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 2,
    number: "INV-2026-002",
    client: "Nova Labs",
    clientEmail: "ananya@novalabs.com",
    project: "Mobile App UI",
    amount: 62000,
    status: "Sent",
    issueDate: "2026-08-20",
    dueDate: "2026-09-20",
    description: "Mobile application UI/UX.",
    items: [
      {
        id: 1,
        description: "Mobile app UI",
        quantity: 1,
        rate: 62000,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 3,
    number: "INV-2026-003",
    client: "Bright Studio",
    clientEmail: "arjun@brightstudio.com",
    project: "Brand Identity",
    amount: 45000,
    status: "Overdue",
    issueDate: "2026-07-15",
    dueDate: "2026-08-15",
    description: "Brand identity package.",
    items: [
      {
        id: 1,
        description: "Brand identity",
        quantity: 1,
        rate: 45000,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 4,
    number: "INV-2026-004",
    client: "Vertex Technologies",
    clientEmail: "priya@vertex.com",
    project: "SaaS Dashboard",
    amount: 110000,
    status: "Draft",
    issueDate: "2026-09-01",
    dueDate: "2026-09-30",
    description: "SaaS dashboard development.",
    items: [
      {
        id: 1,
        description: "SaaS dashboard",
        quantity: 1,
        rate: 110000,
      },
    ],
    tax: 0,
    discount: 0,
  },
  {
    id: 5,
    number: "INV-2026-005",
    client: "Pixel House",
    clientEmail: "karan@pixelhouse.com",
    project: "Marketing Website",
    amount: 38000,
    status: "Viewed",
    issueDate: "2026-09-01",
    dueDate: "2026-09-30",
    description: "Marketing website.",
    items: [
      {
        id: 1,
        description: "Marketing website",
        quantity: 1,
        rate: 38000,
      },
    ],
    tax: 0,
    discount: 0,
  },
];

const initialPayments: Payment[] = [
  {
    id: 1,
    paymentNumber: "PAY-2026-001",
    clientName: "Acme Corporation",
    invoiceNumber: "INV-2026-001",
    projectName: "Website Redesign",
    amount: 85000,
    date: "2026-08-28",
    method: "Bank Transfer",
    status: "Completed",
  },
  {
    id: 2,
    paymentNumber: "PAY-2026-002",
    clientName: "Nova Labs",
    invoiceNumber: "INV-2026-002",
    projectName: "Mobile App UI",
    amount: 62000,
    date: "2026-08-30",
    method: "UPI",
    status: "Pending",
  },
  {
    id: 3,
    paymentNumber: "PAY-2026-003",
    clientName: "Bright Studio",
    invoiceNumber: "INV-2026-003",
    projectName: "Brand Identity",
    amount: 45000,
    date: "2026-08-20",
    method: "Card",
    status: "Failed",
  },
  {
    id: 4,
    paymentNumber: "PAY-2026-004",
    clientName: "Vertex Technologies",
    invoiceNumber: "INV-2026-004",
    projectName: "SaaS Dashboard",
    amount: 110000,
    date: "2026-08-25",
    method: "Bank Transfer",
    status: "Completed",
  },
  {
    id: 5,
    paymentNumber: "PAY-2026-005",
    clientName: "Pixel House",
    invoiceNumber: "INV-2026-005",
    projectName: "Marketing Website",
    amount: 38000,
    date: "2026-09-01",
    method: "UPI",
    status: "Completed",
  },
];

const initialExpenses: Expense[] = [
  {
    id: 1,
    title: "Figma Professional",
    description: "Design software subscription",
    category: "Software",
    amount: 1800,
    date: "2026-09-01",
    status: "Paid",
    vendor: "Figma",
  },
  {
    id: 2,
    title: "Adobe Creative Cloud",
    description: "Creative tools subscription",
    category: "Software",
    amount: 4200,
    date: "2026-09-02",
    status: "Paid",
    vendor: "Adobe",
  },
  {
    id: 3,
    title: "Client meeting travel",
    description: "Cab and travel expenses",
    category: "Travel",
    amount: 2500,
    date: "2026-08-28",
    status: "Paid",
    project: "Website Redesign",
  },
  {
    id: 4,
    title: "Cloud hosting",
    description: "Monthly cloud infrastructure",
    category: "Utilities",
    amount: 5600,
    date: "2026-09-03",
    status: "Pending",
    vendor: "Cloud Provider",
  },
];

/* =========================================================
   CONTEXT
========================================================= */

const FreelanceStoreContext =
  createContext<FreelanceStoreValue | undefined>(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export function FreelanceStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [proposals, setProposals] =
    useState<Proposal[]>(initialProposals);
  const [contracts, setContracts] =
    useState<Contract[]>(initialContracts);
  const [projects, setProjects] =
    useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [timeEntries, setTimeEntries] =
    useState<TimeEntry[]>(initialTimeEntries);
  const [invoices, setInvoices] =
    useState<Invoice[]>(initialInvoices);
  const [payments, setPayments] =
    useState<Payment[]>(initialPayments);
  const [expenses, setExpenses] =
    useState<Expense[]>(initialExpenses);

  /* =======================================================
     CLIENTS
  ======================================================= */

  const addClient = (client: Client) => {
    setClients((current) => [...current, client]);
  };

  const updateClient = (client: Client) => {
    setClients((current) =>
      current.map((item) =>
        item.id === client.id ? client : item
      )
    );
  };

  const deleteClient = (id: number) => {
    setClients((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     LEADS
  ======================================================= */

  const addLead = (lead: Lead) => {
    setLeads((current) => [...current, lead]);
  };

  const updateLead = (lead: Lead) => {
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id ? lead : item
      )
    );
  };

  const deleteLead = (id: number) => {
    setLeads((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     PROPOSALS
  ======================================================= */

  const addProposal = (proposal: Proposal) => {
    setProposals((current) => [...current, proposal]);
  };

  const updateProposal = (proposal: Proposal) => {
    setProposals((current) =>
      current.map((item) =>
        item.id === proposal.id ? proposal : item
      )
    );
  };

  const deleteProposal = (id: number) => {
    setProposals((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     CONTRACTS
  ======================================================= */

  const addContract = (contract: Contract) => {
    setContracts((current) => [...current, contract]);
  };

  const updateContract = (contract: Contract) => {
    setContracts((current) =>
      current.map((item) =>
        item.id === contract.id ? contract : item
      )
    );
  };

  const deleteContract = (id: number) => {
    setContracts((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     PROJECTS
  ======================================================= */

  const addProject = (project: Project) => {
    setProjects((current) => [...current, project]);
  };

  const updateProject = (project: Project) => {
    setProjects((current) =>
      current.map((item) =>
        item.id === project.id ? project : item
      )
    );
  };

  const deleteProject = (id: number) => {
    setProjects((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     TASKS
  ======================================================= */

  const addTask = (task: Task) => {
    setTasks((current) => [...current, task]);
  };

  const updateTask = (task: Task) => {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? task : item
      )
    );
  };

  const deleteTask = (id: number) => {
    setTasks((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     TIME
  ======================================================= */

  const addTimeEntry = (entry: TimeEntry) => {
    setTimeEntries((current) => [...current, entry]);
  };

  const updateTimeEntry = (entry: TimeEntry) => {
    setTimeEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? entry : item
      )
    );
  };

  const deleteTimeEntry = (id: number) => {
    setTimeEntries((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     INVOICES
  ======================================================= */

  const addInvoice = (invoice: Invoice) => {
    setInvoices((current) => [...current, invoice]);
  };

  const updateInvoice = (invoice: Invoice) => {
    setInvoices((current) =>
      current.map((item) =>
        item.id === invoice.id ? invoice : item
      )
    );
  };

  const deleteInvoice = (id: number) => {
    setInvoices((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     PAYMENTS
  ======================================================= */

  const addPayment = (payment: Payment) => {
    setPayments((current) => [...current, payment]);
  };

  const updatePayment = (payment: Payment) => {
    setPayments((current) =>
      current.map((item) =>
        item.id === payment.id ? payment : item
      )
    );
  };

  const deletePayment = (id: number) => {
    setPayments((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     EXPENSES
  ======================================================= */

  const addExpense = (expense: Expense) => {
    setExpenses((current) => [...current, expense]);
  };

  const updateExpense = (expense: Expense) => {
    setExpenses((current) =>
      current.map((item) =>
        item.id === expense.id ? expense : item
      )
    );
  };

  const deleteExpense = (id: number) => {
    setExpenses((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetDemoData = () => {
    setClients(initialClients);
    setLeads(initialLeads);
    setProposals(initialProposals);
    setContracts(initialContracts);
    setProjects(initialProjects);
    setTasks(initialTasks);
    setTimeEntries(initialTimeEntries);
    setInvoices(initialInvoices);
    setPayments(initialPayments);
    setExpenses(initialExpenses);
  };

  const value = useMemo<FreelanceStoreValue>(
    () => ({
      clients,
      leads,
      proposals,
      contracts,
      projects,
      tasks,
      timeEntries,
      invoices,
      payments,
      expenses,

      addClient,
      updateClient,
      deleteClient,

      addLead,
      updateLead,
      deleteLead,

      addProposal, 
      updateProposal,
      deleteProposal,

      addContract,
      updateContract,
      deleteContract,

      addProject,
      updateProject,
      deleteProject,

      addTask,
      updateTask,
      deleteTask,

      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,

      addInvoice,
      updateInvoice,
      deleteInvoice,

      addPayment,
      updatePayment,
      deletePayment,

      addExpense,
      updateExpense,
      deleteExpense,

      resetDemoData,
    }),
    [
      clients,
      leads,
      proposals,
      contracts,
      projects,
      tasks,
      timeEntries,
      invoices,
      payments,
      expenses,
    ]
  );

  return (
    <FreelanceStoreContext.Provider value={value}>
      {children}
    </FreelanceStoreContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useFreelanceStore() {
  const context = useContext(FreelanceStoreContext);

  if (!context) {
    throw new Error(
      "useFreelanceStore must be used inside FreelanceStoreProvider"
    );
  }

  return context;
}