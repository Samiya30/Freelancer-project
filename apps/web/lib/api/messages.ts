import { api } from "./http";

export type Message = {
  id: number;
  text: string;
  sender: string;
  time: string;
  read: boolean;
  conversationId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: number;
  name: string;
  company: string;
  initials: string;
  gradient: string;
  online: boolean;
  unread: number;
  starred: boolean;
  archived: boolean;
  lastMessage: string;
  lastTime: string;
  workspaceId: number;
  userId: number;
  clientId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationWithMessages =
  Conversation & {
    client: {
      id: number;
      name: string;
      company: string;
      email: string;
    } | null;
    messages: Message[];
  };

export async function getConversations() {
  return api.get<Conversation[]>(
    "/api/messages/conversations",
  );
}

export async function getConversation(
  conversationId: number,
) {
  return api.get<ConversationWithMessages>(
    `/api/messages/conversations/${conversationId}`,
  );
}

export async function createConversation(
  clientId: number,
  message: string,
) {
  return api.post<ConversationWithMessages>(
    "/api/messages/conversations",
    {
      clientId,
      message,
    },
  );
}

export async function sendMessage(
  conversationId: number,
  text: string,
) {
  return api.post<Message>(
    `/api/messages/conversations/${conversationId}/messages`,
    {
      text,
    },
  );
}

export async function markConversationRead(
  conversationId: number,
) {
  return api.patch<undefined>(
    `/api/messages/conversations/${conversationId}/read`,
    {},
  );
}

export async function toggleConversationStar(
  conversationId: number,
) {
  return api.patch<Conversation>(
    `/api/messages/conversations/${conversationId}/star`,
    {},
  );
}

export async function archiveConversation(
  conversationId: number,
) {
  return api.patch<Conversation>(
    `/api/messages/conversations/${conversationId}/archive`,
    {},
  );
}

export async function deleteConversation(
  conversationId: number,
) {
  return api.delete<undefined>(
    `/api/messages/conversations/${conversationId}`,
  );
}