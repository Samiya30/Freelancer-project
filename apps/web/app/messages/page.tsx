"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";

import {
  archiveConversation,
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  markConversationRead,
  sendMessage,
  toggleConversationStar,
  type Conversation,
  type ConversationWithMessages,
  type Message,
} from "@/lib/api/messages";

import {
  getClients,
  type ApiClient,
} from "@/lib/api/clients";

import {
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  Video,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  X,
  Users,
  MessageCircle,
  Bell,
} from "lucide-react";

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();

  const isToday =
    date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.toDateString() ===
    new Date().toDateString()
  );
}

export default function MessagesPage() {
  const { showToast } = useToast();

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [
    selectedConversation,
    setSelectedConversation,
  ] =
    useState<ConversationWithMessages | null>(
      null,
    );

  const [clients, setClients] =
    useState<ApiClient[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [newMessage, setNewMessage] =
    useState("");

  const [newClientId, setNewClientId] =
    useState("");

  const [mobileChatOpen, setMobileChatOpen] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [newMessageOpen, setNewMessageOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    conversationLoading,
    setConversationLoading,
  ] = useState(false);

  const [sending, setSending] =
    useState(false);

  const [
    creatingConversation,
    setCreatingConversation,
  ] = useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Load conversations and clients.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const [
          conversationsResponse,
          clientsResponse,
        ] = await Promise.all([
          getConversations(),
          getClients(),
        ]);

        if (cancelled) {
          return;
        }

        const loadedConversations =
          conversationsResponse.data ?? [];

        const loadedClients =
          clientsResponse.data ?? [];

        setConversations(
          loadedConversations,
        );

        setClients(
          loadedClients.filter(
            (client) =>
              client.status === "Active",
          ),
        );

        if (
          loadedConversations.length > 0
        ) {
          setSelectedId(
            loadedConversations[0].id,
          );
        } else {
          setSelectedId(null);
          setSelectedConversation(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load messages:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load messages.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load the selected conversation and its messages.
   */
  useEffect(() => {
    if (selectedId === null) {
      setSelectedConversation(null);
      return;
    }

    /*
     * Capture the narrowed ID.
     * This is important because TypeScript
     * otherwise widens selectedId inside
     * the async function below.
     */
    const conversationId = selectedId;

    let cancelled = false;

    async function loadConversation() {
      try {
        setConversationLoading(true);

        const response =
          await getConversation(
            conversationId,
          );

        if (cancelled) {
          return;
        }

        if (!response.data) {
          throw new Error(
            "Conversation data was not returned.",
          );
        }

        setSelectedConversation(
          response.data,
        );

        /*
         * Mark unread messages as read.
         */
        const selected =
          conversations.find(
            (conversation) =>
              conversation.id ===
              conversationId,
          );

        if (
          selected &&
          selected.unread > 0
        ) {
          try {
            await markConversationRead(
              conversationId,
            );

            if (!cancelled) {
              setConversations(
                (current) =>
                  current.map(
                    (conversation) =>
                      conversation.id ===
                      conversationId
                        ? {
                            ...conversation,
                            unread: 0,
                          }
                        : conversation,
                  ),
              );
            }
          } catch (readError) {
            console.error(
              "Failed to mark conversation as read:",
              readError,
            );
          }
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load conversation:",
          err,
        );

        showToast(
          err instanceof Error
            ? err.message
            : "Failed to load conversation.",
          "error",
        );
      } finally {
        if (!cancelled) {
          setConversationLoading(false);
        }
      }
    }

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    conversations,
    showToast,
  ]);

  const filteredConversations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          conversation.name
            .toLowerCase()
            .includes(query) ||
          conversation.company
            .toLowerCase()
            .includes(query) ||
          conversation.lastMessage
            .toLowerCase()
            .includes(query),
      );
    }, [conversations, search]);

  const unreadCount =
    conversations.reduce(
      (sum, conversation) =>
        sum + conversation.unread,
      0,
    );

  const starredCount =
    conversations.filter(
      (conversation) =>
        conversation.starred,
    ).length;

  const handleSelectConversation = (
    id: number,
  ) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setMenuOpen(false);
  };

  const handleSend = async () => {
    const trimmed =
      message.trim();

    if (
      !trimmed ||
      !selectedConversation ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const response =
        await sendMessage(
          selectedConversation.id,
          trimmed,
        );

      if (!response.data) {
        throw new Error(
          "Message was not returned by the server.",
        );
      }

      const sentMessage =
        response.data;

      setSelectedConversation(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            lastMessage:
              sentMessage.text,
            lastTime:
              sentMessage.time,
            messages: [
              ...current.messages,
              sentMessage,
            ],
          };
        },
      );

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              conversation.id ===
              selectedConversation.id
                ? {
                    ...conversation,
                    lastMessage:
                      sentMessage.text,
                    lastTime:
                      sentMessage.time,
                  }
                : conversation,
          ),
      );

      setMessage("");
    } catch (err) {
      console.error(
        "Failed to send message:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Failed to send message.",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleStar = async (
    id: number,
  ) => {
    if (actionLoading) {
      return;
    }

    try {
      setActionLoading(true);

      const response =
        await toggleConversationStar(
          id,
        );

      if (!response.data) {
        throw new Error(
          "Updated conversation was not returned.",
        );
      }

      const updated =
        response.data;

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              conversation.id === id
                ? {
                    ...conversation,
                    starred:
                      updated.starred,
                  }
                : conversation,
          ),
      );

      setSelectedConversation(
        (current) =>
          current &&
          current.id === id
            ? {
                ...current,
                starred:
                  updated.starred,
              }
            : current,
      );
    } catch (err) {
      console.error(
        "Failed to update star:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Failed to update conversation.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (
    id: number,
  ) => {
    if (actionLoading) {
      return;
    }

    try {
      setActionLoading(true);

      await archiveConversation(id);

      const remaining =
        conversations.filter(
          (conversation) =>
            conversation.id !== id,
        );

      setConversations(
        remaining,
      );

      setMenuOpen(false);

      showToast(
        "Conversation archived.",
        "success",
      );

      if (selectedId === id) {
        const next =
          remaining[0];

        setSelectedId(
          next?.id ?? null,
        );

        if (!next) {
          setSelectedConversation(
            null,
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to archive conversation:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Failed to archive conversation.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (
    id: number,
  ) => {
    if (actionLoading) {
      return;
    }

    try {
      setActionLoading(true);

      await deleteConversation(id);

      const remaining =
        conversations.filter(
          (conversation) =>
            conversation.id !== id,
        );

      setConversations(
        remaining,
      );

      setMenuOpen(false);

      showToast(
        "Conversation deleted.",
        "success",
      );

      if (selectedId === id) {
        const next =
          remaining[0];

        setSelectedId(
          next?.id ?? null,
        );

        if (!next) {
          setSelectedConversation(
            null,
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to delete conversation:",
        err,
      );

      showToast(
        err instanceof Error
          ? err.message
          : "Failed to delete conversation.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAttachment = () => {
    showToast(
      "File attachments will connect to storage in the next phase.",
      "info",
    );
  };

  const handleEmoji = () => {
    setMessage(
      (current) =>
        `${current} 😊`,
    );
  };

  const handleVideo = () => {
    showToast(
      "Video calling will be available in a later phase.",
      "info",
    );
  };

  const handleCreateConversation =
    async () => {
      const trimmed =
        newMessage.trim();

      const clientId =
        Number(newClientId);

      if (
        !clientId ||
        !trimmed ||
        creatingConversation
      ) {
        return;
      }

      try {
        setCreatingConversation(
          true,
        );

        const response =
          await createConversation(
            clientId,
            trimmed,
          );

        if (!response.data) {
          throw new Error(
            "Conversation was not returned by the server.",
          );
        }

        const created =
          response.data;

        const summary: Conversation =
          {
            id: created.id,
            name: created.name,
            company:
              created.company,
            initials:
              created.initials,
            gradient:
              created.gradient,
            online:
              created.online,
            unread:
              created.unread,
            starred:
              created.starred,
            archived:
              created.archived,
            lastMessage:
              created.lastMessage,
            lastTime:
              created.lastTime,
            workspaceId:
              created.workspaceId,
            userId:
              created.userId,
            clientId:
              created.clientId,
            createdAt:
              created.createdAt,
            updatedAt:
              created.updatedAt,
          };

        setConversations(
          (current) => [
            summary,
            ...current,
          ],
        );

        setSelectedId(
          created.id,
        );

        setSelectedConversation(
          created,
        );

        setNewMessageOpen(
          false,
        );

        setNewClientId("");
        setNewMessage("");

        setMobileChatOpen(true);

        showToast(
          "Conversation created successfully.",
          "success",
        );
      } catch (err) {
        console.error(
          "Failed to create conversation:",
          err,
        );

        showToast(
          err instanceof Error
            ? err.message
            : "Failed to create conversation.",
          "error",
        );
      } finally {
        setCreatingConversation(
          false,
        );
      }
    };

  return (
    <AppShell>
      <div className="flex h-full min-h-[calc(100vh-64px)] flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Client Communication
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Messages
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Keep every client conversation organized in one workspace.
                </p>
              </div>

              <button
                onClick={() =>
                  setNewMessageOpen(true)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                New Message
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-[1700px] flex-1 min-h-0 flex-col px-4 py-5 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-600">
                    Conversations
                  </p>

                  <p className="mt-1 text-2xl font-bold text-indigo-950">
                    {conversations.length}
                  </p>
                </div>

                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600">
                    Unread
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-950">
                    {unreadCount}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                  <Bell className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-fuchsia-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-pink-600">
                    Starred
                  </p>

                  <p className="mt-1 text-2xl font-bold text-pink-950">
                    {starredCount}
                  </p>
                </div>

                <div className="rounded-xl bg-pink-100 p-2.5 text-pink-600">
                  <Star className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {/* Messaging Workspace */}
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            {/* Conversations */}
            <aside
              className={`w-full shrink-0 border-r border-slate-200 bg-white lg:block lg:w-[360px] ${
                mobileChatOpen
                  ? "hidden"
                  : "block"
              }`}
            >
              <div className="border-b border-slate-100 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search conversations..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {loading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({
                      length: 5,
                    }).map(
                      (_, index) => (
                        <div
                          key={index}
                          className="flex animate-pulse gap-3 rounded-xl p-2"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-slate-200" />

                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 rounded bg-slate-200" />
                            <div className="h-3 w-24 rounded bg-slate-100" />
                            <div className="h-3 w-full rounded bg-slate-100" />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <>
                    {filteredConversations.map(
                      (
                        conversation,
                      ) => {
                        const active =
                          conversation.id ===
                          selectedId;

                        return (
                          <button
                            key={
                              conversation.id
                            }
                            onClick={() =>
                              handleSelectConversation(
                                conversation.id,
                              )
                            }
                            className={`w-full border-b border-slate-100 p-4 text-left transition ${
                              active
                                ? "bg-gradient-to-r from-indigo-50 to-violet-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="relative shrink-0">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${conversation.gradient} text-sm font-bold text-white shadow-sm`}
                                >
                                  {
                                    conversation.initials
                                  }
                                </div>

                                {conversation.online && (
                                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-sm font-bold text-slate-900">
                                      {
                                        conversation.name
                                      }
                                    </h3>

                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                      {
                                        conversation.company
                                      }
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-[10px] text-slate-400">
                                    {formatTime(
                                      conversation.lastTime,
                                    )}
                                  </span>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <p className="truncate text-xs text-slate-500">
                                    {
                                      conversation.lastMessage
                                    }
                                  </p>

                                  <div className="flex shrink-0 items-center gap-1">
                                    {conversation.starred && (
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    )}

                                    {conversation.unread >
                                      0 && (
                                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                                        {
                                          conversation.unread
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      },
                    )}

                    {filteredConversations.length ===
                      0 && (
                      <div className="p-8 text-center">
                        <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No conversations found
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {search.trim()
                            ? "Try a different search."
                            : "Start a new conversation to begin messaging."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </aside>

            {/* Chat */}
            <section
              className={`min-w-0 flex-1 flex-col ${
                mobileChatOpen
                  ? "flex"
                  : "hidden lg:flex"
              }`}
            >
              {conversationLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

                    <p className="mt-3 text-sm font-medium text-slate-500">
                      Loading conversation...
                    </p>
                  </div>
                </div>
              ) : selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        onClick={() =>
                          setMobileChatOpen(
                            false,
                          )
                        }
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                      >
                        <X className="h-5 w-5" />
                      </button>

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedConversation.gradient} text-sm font-bold text-white shadow-sm`}
                      >
                        {
                          selectedConversation.initials
                        }
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                            {
                              selectedConversation.name
                            }
                          </h2>

                          {selectedConversation.online && (
                            <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 sm:inline-flex">
                              Online
                            </span>
                          )}
                        </div>

                        <p className="truncate text-xs text-slate-400">
                          {
                            selectedConversation.company
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleVideo}
                        className="hidden rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 sm:block"
                        title="Video call"
                      >
                        <Video className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          void handleStar(
                            selectedConversation.id,
                          )
                        }
                        disabled={
                          actionLoading
                        }
                        className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-amber-500 disabled:opacity-50"
                        title="Star"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            selectedConversation.starred
                              ? "fill-amber-400 text-amber-400"
                              : ""
                          }`}
                        />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuOpen(
                              (current) =>
                                !current,
                            )
                          }
                          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                          <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            <button
                              onClick={() =>
                                void handleArchive(
                                  selectedConversation.id,
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archive
                            </button>

                            <button
                              onClick={() =>
                                void handleDelete(
                                  selectedConversation.id,
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 via-white to-indigo-50/30 p-4 sm:p-6">
                    <div className="mx-auto max-w-3xl space-y-5">
                      <div className="flex justify-center">
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm">
                          {selectedConversation.messages.some(
                            (item) =>
                              isToday(
                                item.time,
                              ),
                          )
                            ? "Today"
                            : formatTime(
                                selectedConversation
                                  .messages[0]
                                  ?.time ??
                                  selectedConversation.createdAt,
                              )}
                        </span>
                      </div>

                      {selectedConversation.messages.map(
                        (msg: Message) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender ===
                              "me"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex max-w-[82%] flex-col sm:max-w-[70%] ${
                                msg.sender ===
                                "me"
                                  ? "items-end"
                                  : "items-start"
                              }`}
                            >
                              <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                  msg.sender ===
                                  "me"
                                    ? "rounded-br-md bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                                    : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                                }`}
                              >
                                {msg.text}
                              </div>

                              <div
                                className={`mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-slate-400 ${
                                  msg.sender ===
                                  "me"
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <span>
                                  {formatMessageTime(
                                    msg.time,
                                  )}
                                </span>

                                {msg.sender ===
                                  "me" &&
                                  msg.read && (
                                    <CheckCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  )}
                              </div>
                            </div>
                          </div>
                        ),
                      )}

                      {selectedConversation.messages.length ===
                        0 && (
                        <div className="py-16 text-center">
                          <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No messages yet
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Send the first message below.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Composer */}
                  <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
                    <div className="mx-auto max-w-3xl">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
                        <textarea
                          value={message}
                          onChange={(event) =>
                            setMessage(
                              event.target
                                .value,
                            )
                          }
                          onKeyDown={
                            handleKeyDown
                          }
                          rows={2}
                          disabled={sending}
                          placeholder={`Message ${selectedConversation.name.split(" ")[0]}...`}
                          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-60"
                        />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={
                                handleAttachment
                              }
                              className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-indigo-600"
                              title="Attach file"
                            >
                              <Paperclip className="h-4 w-4" />
                            </button>

                            <button
                              onClick={
                                handleAttachment
                              }
                              className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-indigo-600"
                              title="Add image"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>

                            <button
                              onClick={
                                handleEmoji
                              }
                              className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-amber-500"
                              title="Emoji"
                            >
                              <Smile className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              void handleSend()
                            }
                            disabled={
                              !message.trim() ||
                              sending
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {sending ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Sending
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                Send
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">
                        Press Enter to send · Shift + Enter for a new line
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
                    <MessageCircle className="h-7 w-7" />
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-slate-900">
                    Select a conversation
                  </h2>

                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Choose a client conversation from the left to start messaging.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Bottom Banner */}
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-4 text-white shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Keep conversations connected to your projects
                  </p>

                  <p className="mt-0.5 text-xs text-indigo-100">
                    Files, tasks, contracts and client messages will work together in the full workspace.
                  </p>
                </div>
              </div>

              <a
                href="/files"
                className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-indigo-100"
              >
                View Files
                <ArrowRightIcon />
              </a>
            </div>
          </div>
        </main>

        {/* New Message Modal */}
        {newMessageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="rounded-t-3xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-100">
                      Communication
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      New Message
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      setNewMessageOpen(
                        false,
                      )
                    }
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Client
                  </label>

                  <select
                    value={newClientId}
                    onChange={(event) =>
                      setNewClientId(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">
                      Select a client
                    </option>

                    {clients.map(
                      (client) => (
                        <option
                          key={client.id}
                          value={client.id}
                        >
                          {client.name} —{" "}
                          {client.company}
                        </option>
                      ),
                    )}
                  </select>

                  {clients.length ===
                    0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No active clients are available.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Message
                  </label>

                  <textarea
                    value={newMessage}
                    onChange={(event) =>
                      setNewMessage(
                        event.target
                          .value,
                      )
                    }
                    rows={5}
                    placeholder="Write your message..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() =>
                      setNewMessageOpen(
                        false,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() =>
                      void handleCreateConversation()
                    }
                    disabled={
                      !newClientId ||
                      !newMessage.trim() ||
                      creatingConversation
                    }
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creatingConversation
                      ? "Creating..."
                      : "Start Conversation"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12H19M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}