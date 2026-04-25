/**
 * v1.2 #1 chat — 1:1 견적 협의 채널 타입.
 * Firestore `threads/{threadId}` + `threads/{threadId}/messages/{messageId}`.
 */

export type ThreadRole = "client" | "provider";
/**
 * v1.2 #1 chat은 "text"만 · v1.3 #1 booking에서 "system" 확장.
 * 시스템 메시지는 중앙 정렬 gray bg + icon prefix (MessageBubble branch).
 */
export type MessageType = "text" | "system";

export interface Thread {
  id: string;
  clientUid: string;
  providerId: string;
  providerOwnerUid: string;
  requestId: string;
  quoteId: string | null;
  companyName: string;
  clientDisplayName: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastMessageSenderUid: string | null;
  unreadByClient: number;
  unreadByProvider: number;
  createdAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderUid: string;
  senderRole: ThreadRole;
  type: MessageType;
  text: string;
  createdAt: Date;
}

/** Server → Client boundary · primitive only */
export interface ThreadRowDTO {
  id: string;
  counterpartName: string;
  lastMessagePreview: string | null;
  lastMessageAtMs: number | null;
  unreadCount: number;
  quoteAmount: number | null;
  isNew: boolean; // lastMessageAt === null
}

export interface MessageBubbleDTO {
  id: string;
  text: string;
  mine: boolean;
  createdAtMs: number;
  type: MessageType; // v1.3 "system" 지원
}
