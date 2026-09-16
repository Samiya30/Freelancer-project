"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Search,
  Upload,
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode2,
  File,
  MoreHorizontal,
  Download,
  Copy,
  Share2,
  Trash2,
  X,
  Grid3X3,
  List,
  Users,
  HardDrive,
  FolderKanban,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  deleteFile,
  duplicateFile,
  downloadFile,
  getFiles,
  updateFile,
  uploadFile,
  type ApiFile,
  type FileType,
} from "@/lib/api/files";

type WorkspaceFile = {
  id: number;
  name: string;
  type: FileType;
  size: string;
  date: string;
  folder: string;
  shared: boolean;
  client?: string;
  projectId?: number | null;
};

type WorkspaceFolder = {
  id: number;
  name: string;
  files: number;
  color: string;
  project?: string;
};

const initialFolders: WorkspaceFolder[] = [
  {
    id: 1,
    name: "Website Redesign",
    files: 8,
    color: "from-violet-500 to-fuchsia-500",
    project: "Website Redesign",
  },
  {
    id: 2,
    name: "Mobile App UI",
    files: 6,
    color: "from-blue-500 to-cyan-500",
    project: "Mobile App UI",
  },
  {
    id: 3,
    name: "Brand Identity",
    files: 5,
    color: "from-orange-500 to-pink-500",
    project: "Brand Identity",
  },
  {
    id: 4,
    name: "SaaS Dashboard",
    files: 9,
    color: "from-emerald-500 to-teal-500",
    project: "SaaS Dashboard",
  },
];

const fileTypes: Array<"All" | FileType> = [
  "All",
  "PDF",
  "DOC",
  "XLS",
  "IMAGE",
  "ZIP",
  "CODE",
  "OTHER",
];

function getFileIcon(type: FileType) {
  switch (type) {
    case "PDF":
      return <FileText className="h-6 w-6" />;

    case "DOC":
      return <FileText className="h-6 w-6" />;

    case "XLS":
      return <FileSpreadsheet className="h-6 w-6" />;

    case "IMAGE":
      return <FileImage className="h-6 w-6" />;

    case "ZIP":
      return <FileArchive className="h-6 w-6" />;

    case "CODE":
      return <FileCode2 className="h-6 w-6" />;

    default:
      return <File className="h-6 w-6" />;
  }
}

function getFileStyle(type: FileType) {
  switch (type) {
    case "PDF":
      return "bg-rose-50 text-rose-600 border-rose-100";

    case "DOC":
      return "bg-blue-50 text-blue-600 border-blue-100";

    case "XLS":
      return "bg-emerald-50 text-emerald-600 border-emerald-100";

    case "IMAGE":
      return "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100";

    case "ZIP":
      return "bg-amber-50 text-amber-600 border-amber-100";

    case "CODE":
      return "bg-violet-50 text-violet-600 border-violet-100";

    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mapApiFile(file: ApiFile): WorkspaceFile {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    size: formatFileSize(file.size),
    date: file.createdAt.slice(0, 10),
    folder: file.folder,
    shared: file.shared,
    client: file.client ?? undefined,
    projectId: file.projectId,
  };
}

export default function FilesPage() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("files.create");
  const canUpdate = hasPermission("files.update");
  const canDelete = hasPermission("files.delete");

  const [folders, setFolders] =
    useState<WorkspaceFolder[]>(initialFolders);

  const [files, setFiles] =
    useState<WorkspaceFile[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<"All" | FileType>("All");

  const [selectedFolder, setSelectedFolder] =
    useState<string>("All Files");

  const [viewMode, setViewMode] =
    useState<"grid" | "list">("grid");

  const [menuId, setMenuId] =
    useState<number | null>(null);

  const [deleteFileId, setDeleteFileId] =
    useState<number | null>(null);

  const [newFolderOpen, setNewFolderOpen] =
    useState(false);

  const [newFolderName, setNewFolderName] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFiles() {
      try {
        setLoading(true);

        const response = await getFiles();

        if (!mounted) {
          return;
        }

        const mappedFiles =
          (response.data ?? []).map(mapApiFile);

        setFiles(mappedFiles);
      } catch (error) {
        console.error(
          "Failed to load files:",
          error
        );

        if (mounted) {
          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load files.",
            "error"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFiles();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const filteredFiles = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return files.filter((file) => {
      const matchesSearch =
        !query ||
        file.name
          .toLowerCase()
          .includes(query) ||
        file.folder
          .toLowerCase()
          .includes(query) ||
        file.client
          ?.toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "All" ||
        file.type === typeFilter;

      const matchesFolder =
        selectedFolder === "All Files" ||
        selectedFolder ===
          "Shared with Clients" ||
        file.folder === selectedFolder;

      const matchesShared =
        selectedFolder !==
          "Shared with Clients" ||
        file.shared;

      return (
        matchesSearch &&
        matchesType &&
        matchesFolder &&
        matchesShared
      );
    });
  }, [
    files,
    search,
    typeFilter,
    selectedFolder,
  ]);

  const totalStorage = files.reduce(
    (sum, file) => {
      const value =
        Number.parseFloat(file.size);

      if (Number.isNaN(value)) {
        return sum;
      }

      if (file.size.includes("GB")) {
        return sum + value * 1024;
      }

      if (file.size.includes("MB")) {
        return sum + value;
      }

      if (file.size.includes("KB")) {
        return sum + value / 1024;
      }

      return sum + value / (1024 * 1024);
    },
    0
  );

  const sharedFiles = files.filter(
    (file) => file.shared
  ).length;

  const handleUploadClick = () => {
    if (!canCreate) {
      showToast(
        "You do not have permission to upload files.",
        "error"
      );
      return;
    }

    fileInputRef.current?.click();
  };

  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (!canCreate) {
      event.target.value = "";

      showToast(
        "You do not have permission to upload files.",
        "error"
      );

      return;
    }

    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    try {
      setLoading(true);

      const folder =
        selectedFolder !== "All Files" &&
        selectedFolder !==
          "Shared with Clients"
          ? selectedFolder
          : "General";

      const createdFiles: WorkspaceFile[] =
        [];

      for (const selectedFile of selectedFiles) {
        const response =
          await uploadFile({
            file: selectedFile,
            folder,
            shared: false,
          });

        if (response.success && response.data) {
          createdFiles.push(
            mapApiFile(response.data)
          );
        }
      }

      setFiles((current) => [
        ...createdFiles,
        ...current,
      ]);

      if (createdFiles.length > 0) {
        showToast(
          `${createdFiles.length} file${
            createdFiles.length > 1
              ? "s"
              : ""
          } uploaded successfully.`,
          "success"
        );
      } else {
        showToast(
          "No files were uploaded.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Failed to upload files:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to upload files.",
        "error"
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleCreateFolder = () => {
    if (!canCreate) {
      showToast(
        "You do not have permission to create folders.",
        "error"
      );
      return;
    }

    if (!newFolderName.trim()) {
      showToast(
        "Enter a folder name.",
        "error"
      );

      return;
    }

    const newFolder: WorkspaceFolder = {
      id: Date.now(),
      name: newFolderName.trim(),
      files: 0,
      color:
        "from-cyan-500 to-blue-500",
    };

    setFolders((current) => [
      ...current,
      newFolder,
    ]);

    setNewFolderName("");
    setNewFolderOpen(false);

    showToast(
      "Folder created successfully.",
      "success"
    );
  };

  const handleDownload = async (
    file: WorkspaceFile
  ) => {
    try {
      setActionLoading(file.id);

      await downloadFile(
        file.id,
        file.name
      );

      setMenuId(null);

      showToast(
        "File downloaded successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to download file:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to download file.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (
    file: WorkspaceFile
  ) => {
    if (!canCreate) {
      showToast(
        "You do not have permission to duplicate files.",
        "error"
      );
      return;
    }

    try {
      setActionLoading(file.id);

      const response =
        await duplicateFile(file.id);

      if (response.success && response.data) {
        setFiles((current) => [
          mapApiFile(response.data!),
          ...current,
        ]);
      }

      setMenuId(null);

      showToast(
        "File duplicated successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to duplicate file:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to duplicate file.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async (
    file: WorkspaceFile
  ) => {
    if (!canUpdate) {
      showToast(
        "You do not have permission to update files.",
        "error"
      );
      return;
    }

    try {
      setActionLoading(file.id);

      const response =
        await updateFile(
          file.id,
          {
            shared: true,
          }
        );

      if (response.success && response.data) {
        const updatedFile =
          mapApiFile(response.data);

        setFiles((current) =>
          current.map((item) =>
            item.id === file.id
              ? updatedFile
              : item
          )
        );
      }

      setMenuId(null);

      showToast(
        "File shared with the client.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to share file:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to share file.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnshare = async (
    file: WorkspaceFile
  ) => {
    if (!canUpdate) {
      showToast(
        "You do not have permission to update files.",
        "error"
      );
      return;
    }

    try {
      setActionLoading(file.id);

      const response =
        await updateFile(
          file.id,
          {
            shared: false,
          }
        );

      if (response.success && response.data) {
        const updatedFile =
          mapApiFile(response.data);

        setFiles((current) =>
          current.map((item) =>
            item.id === file.id
              ? updatedFile
              : item
          )
        );
      }

      setMenuId(null);

      showToast(
        "File removed from client sharing.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to stop sharing file:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to stop sharing file.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      showToast(
        "You do not have permission to delete files.",
        "error"
      );
      return;
    }

    if (deleteFileId === null) {
      return;
    }

    try {
      setActionLoading(deleteFileId);

      const response =
        await deleteFile(deleteFileId);

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to delete file."
        );
      }

      setFiles((current) =>
        current.filter(
          (file) =>
            file.id !== deleteFileId
        )
      );

      setDeleteFileId(null);
      setMenuId(null);

      showToast(
        "File deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to delete file:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete file.",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppShell>
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <HardDrive className="h-3.5 w-3.5" />
                  Workspace
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Files
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Store project files, share documents and keep everything organized.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {canCreate && (
                  <button
                    onClick={() =>
                      setNewFolderOpen(true)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Folder className="h-4 w-4" />
                    New Folder
                  </button>
                )}

                {canCreate && (
                  <button
                    onClick={handleUploadClick}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-700">
                    Total Files
                  </p>

                  <p className="mt-2 text-3xl font-bold text-cyan-950">
                    {loading
                      ? "..."
                      : files.length}
                  </p>

                  <p className="mt-1 text-xs text-cyan-600">
                    Across your workspace
                  </p>
                </div>

                <div className="rounded-xl bg-cyan-100 p-3 text-cyan-600">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">
                    Folders
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-950">
                    {folders.length}
                  </p>

                  <p className="mt-1 text-xs text-violet-600">
                    Project workspaces
                  </p>
                </div>

                <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                  <FolderOpen className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Shared
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-950">
                    {sharedFiles}
                  </p>

                  <p className="mt-1 text-xs text-emerald-600">
                    Visible to clients
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-pink-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Storage Used
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-950">
                    {totalStorage.toFixed(1)} MB
                  </p>

                  <p className="mt-1 text-xs text-orange-600">
                    Workspace storage
                  </p>
                </div>

                <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                  <HardDrive className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Project Folders
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Organize files by project.
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedFolder("All Files")
                }
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View all
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() =>
                    setSelectedFolder(
                      folder.name
                    )
                  }
                  className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    selectedFolder ===
                    folder.name
                      ? "border-cyan-300 ring-4 ring-cyan-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${folder.color} text-white shadow-sm`}
                    >
                      <FolderOpen className="h-6 w-6" />
                    </div>

                    <MoreHorizontal className="h-5 w-5 text-slate-300" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {folder.name}
                  </h3>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {
                        files.filter(
                          (file) =>
                            file.folder ===
                            folder.name
                        ).length
                      }{" "}
                      files
                    </span>

                    {folder.project && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <FolderKanban className="h-3 w-3" />
                        Project
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() =>
              setSelectedFolder(
                "Shared with Clients"
              )
            }
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
              selectedFolder ===
              "Shared with Clients"
                ? "border-emerald-300 bg-emerald-50 ring-4 ring-emerald-50"
                : "border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-emerald-950">
                  Shared with Clients
                </p>

                <p className="mt-0.5 text-xs text-emerald-600">
                  Files your clients can currently access
                </p>
              </div>
            </div>

            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search files..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value as
                      | "All"
                      | FileType
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                {fileTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type === "All"
                      ? "All File Types"
                      : type}
                  </option>
                ))}
              </select>

              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() =>
                    setViewMode("grid")
                  }
                  className={`rounded-lg p-2 ${
                    viewMode === "grid"
                      ? "bg-white text-cyan-600 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>

                <button
                  onClick={() =>
                    setViewMode("list")
                  }
                  className={`rounded-lg p-2 ${
                    viewMode === "list"
                      ? "bg-white text-cyan-600 shadow-sm"
                      : "text-slate-400"
                  }`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {selectedFolder}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {filteredFiles.length} files shown
                </p>
              </div>

              {selectedFolder !==
                "All Files" && (
                <button
                  onClick={() =>
                    setSelectedFolder(
                      "All Files"
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600"
                >
                  Clear folder
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/50 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Workspace Files
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Access, share and manage your project documents.
                  </p>
                </div>

                <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {filteredFiles.length} files
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-14 text-center">
                <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-cyan-50 text-cyan-400">
                  <HardDrive className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  Loading files...
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Fetching your workspace files.
                </p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-400">
                  <File className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  No files found
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Try another search or upload a new file.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredFiles.map(
                  (file) => (
                    <div
                      key={file.id}
                      className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl border ${getFileStyle(
                            file.type
                          )}`}
                        >
                          {getFileIcon(file.type)}
                        </div>

                        <div className="relative">
                          <button
                            disabled={
                              actionLoading ===
                              file.id
                            }
                            onClick={() =>
                              setMenuId(
                                menuId ===
                                  file.id
                                  ? null
                                  : file.id
                              )
                            }
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {menuId === file.id && (
                            <FileMenu
                              file={file}
                              disabled={
                                actionLoading ===
                                file.id
                              }
                              canCreate={canCreate}
                              canUpdate={canUpdate}
                              canDelete={canDelete}
                              onDownload={
                                handleDownload
                              }
                              onDuplicate={
                                handleDuplicate
                              }
                              onShare={
                                handleShare
                              }
                              onUnshare={
                                handleUnshare
                              }
                              onDelete={() =>
                                setDeleteFileId(
                                  file.id
                                )
                              }
                            />
                          )}
                        </div>
                      </div>

                      <h3 className="mt-4 truncate text-sm font-bold text-slate-900">
                        {file.name}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {file.folder}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {file.size}
                        </span>

                        <span className="text-[10px] font-semibold text-slate-400">
                          {file.date}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {file.shared ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <Users className="h-3 w-3" />
                            Shared
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            Private
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-slate-400">
                          {file.type}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div>
                {filteredFiles.map(
                  (file) => (
                    <div
                      key={file.id}
                      className="group flex flex-col gap-4 border-b border-slate-100 p-5 transition hover:bg-cyan-50/20 md:flex-row md:items-center"
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${getFileStyle(
                          file.type
                        )}`}
                      >
                        {getFileIcon(file.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {file.name}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {file.folder}
                          </span>

                          <span className="text-slate-300">
                            •
                          </span>

                          <span className="text-xs text-slate-400">
                            {file.size}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {file.shared ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                            <Users className="h-3 w-3" />
                            Shared
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
                            Private
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-400">
                          {file.date}
                        </span>

                        <div className="relative">
                          <button
                            disabled={
                              actionLoading ===
                              file.id
                            }
                            onClick={() =>
                              setMenuId(
                                menuId ===
                                  file.id
                                  ? null
                                  : file.id
                              )
                            }
                            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {menuId === file.id && (
                            <FileMenu
                              file={file}
                              disabled={
                                actionLoading ===
                                file.id
                              }
                              canCreate={canCreate}
                              canUpdate={canUpdate}
                              canDelete={canDelete}
                              onDownload={
                                handleDownload
                              }
                              onDuplicate={
                                handleDuplicate
                              }
                              onShare={
                                handleShare
                              }
                              onUnshare={
                                handleUnshare
                              }
                              onDelete={() =>
                                setDeleteFileId(
                                  file.id
                                )
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Users className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Give clients a clean project experience
                  </p>

                  <p className="mt-1 text-xs text-cyan-100">
                    Shared files will eventually connect directly to the client portal.
                  </p>
                </div>
              </div>

              <a
                href="/projects"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-cyan-100"
              >
                View Projects
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>

        {newFolderOpen && canCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-cyan-100">
                      Workspace
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      New Folder
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      setNewFolderOpen(false)
                    }
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Folder Name
                </label>

                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) =>
                    setNewFolderName(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateFolder();
                    }
                  }}
                  placeholder="e.g. Client Assets"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() =>
                      setNewFolderOpen(false)
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCreateFolder}
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200"
                  >
                    Create Folder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteFileId !== null && canDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Delete this file?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This file will be removed from your workspace.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() =>
                    setDeleteFileId(null)
                  }
                  disabled={
                    actionLoading !== null
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={
                    actionLoading !== null
                  }
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading !== null
                    ? "Deleting..."
                    : "Delete File"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FileMenu({
  file,
  disabled,
  canCreate,
  canUpdate,
  canDelete,
  onDownload,
  onDuplicate,
  onShare,
  onUnshare,
  onDelete,
}: {
  file: WorkspaceFile;
  disabled: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDownload: (
    file: WorkspaceFile
  ) => void;
  onDuplicate: (
    file: WorkspaceFile
  ) => void;
  onShare: (
    file: WorkspaceFile
  ) => void;
  onUnshare: (
    file: WorkspaceFile
  ) => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-0 top-10 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
      <button
        disabled={disabled}
        onClick={() =>
          onDownload(file)
        }
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </button>

      {canCreate && (
        <button
          disabled={disabled}
          onClick={() =>
            onDuplicate(file)
          }
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </button>
      )}

      {canUpdate &&
        (file.shared ? (
          <button
            disabled={disabled}
            onClick={() =>
              onUnshare(file)
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Stop Sharing
          </button>
        ) : (
          <button
            disabled={disabled}
            onClick={() =>
              onShare(file)
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share with Client
          </button>
        ))}

      {canDelete && (
        <button
          disabled={disabled}
          onClick={onDelete}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}