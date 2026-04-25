"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  sendMessageInputSchema,
  markThreadAsReadInputSchema,
  type SendMessageInput,
  type MarkThreadAsReadInput,
} from "@/domain/chat-schemas";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

const THREADS = "threads";

async function resolveUid(): Promise<string> {
  const jar = await cookies();
  return verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);
}

/** v1.2 #1 chat — 메시지 전송. TX: message.create + thread.update. */
export async function sendMessage(
  rawInput: SendMessageInput,
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const input = sendMessageInputSchema.parse(rawInput);
    const uid = await resolveUid();

    const threadRef = adminDb.collection(THREADS).doc(input.threadId);
    const messageRef = threadRef.collection("messages").doc();
    const messageId = messageRef.id;
    const trimmed = input.text.trim();

    interface TxCaptured {
      clientUid: string;
      providerOwnerUid: string;
      providerId: string;
      companyName: string;
      senderRole: "client" | "provider";
    }

    const captured: TxCaptured = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(threadRef);
      if (!snap.exists) {
        throw new AppError("FORBIDDEN", "채팅방을 찾을 수 없어요");
      }
      const data = snap.data()!;
      const clientUid = String(data.clientUid);
      const providerOwnerUid = String(data.providerOwnerUid);
      if (uid !== clientUid && uid !== providerOwnerUid) {
        throw new AppError("FORBIDDEN", "이 채팅에 참여할 수 없어요");
      }
      const senderRole: "client" | "provider" =
        uid === clientUid ? "client" : "provider";
      const otherKey =
        senderRole === "client" ? "unreadByProvider" : "unreadByClient";

      tx.create(messageRef, {
        threadId: input.threadId,
        senderUid: uid,
        senderRole,
        type: "text",
        text: trimmed,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(threadRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: trimmed.slice(0, 80),
        lastMessageSenderUid: uid,
        [otherKey]: FieldValue.increment(1),
      });

      return {
        clientUid,
        providerOwnerUid,
        providerId: String(data.providerId ?? ""),
        companyName: String(data.companyName ?? ""),
        senderRole,
      };
    });

    // v1.6 · 샘플 AI 자동 응답 (양방향).
    //  - client → sample provider : 업체 페르소나로 응답
    //  - provider → sample customer : 고객 페르소나로 응답
    // 내부 try/catch 로 실패해도 user 흐름엔 영향 X.
    const threadMeta = {
      threadId: input.threadId,
      clientUid: captured.clientUid,
      providerOwnerUid: captured.providerOwnerUid,
      providerId: captured.providerId,
      companyName: captured.companyName,
    };
    if (captured.senderRole === "client") {
      const { maybeTriggerSampleReply } = await import(
        "@/lib/chat/sample-reply"
      );
      await maybeTriggerSampleReply(threadMeta, { uid, role: "client" }, trimmed);
    } else {
      const { maybeTriggerSampleCustomerReply } = await import(
        "@/lib/chat/sample-reply"
      );
      await maybeTriggerSampleCustomerReply(
        threadMeta,
        { uid, role: "provider" },
        trimmed,
      );
    }

    return { ok: true, data: { messageId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/** v1.2 #1 chat — 진입 시 본인 미읽음 카운트 리셋. */
export async function markThreadAsRead(
  rawInput: MarkThreadAsReadInput,
): Promise<ActionResult<{ threadId: string }>> {
  try {
    const input = markThreadAsReadInputSchema.parse(rawInput);
    const uid = await resolveUid();

    const threadRef = adminDb.collection(THREADS).doc(input.threadId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(threadRef);
      if (!snap.exists) {
        throw new AppError("FORBIDDEN", "채팅방을 찾을 수 없어요");
      }
      const data = snap.data()!;
      const clientUid = String(data.clientUid);
      const providerOwnerUid = String(data.providerOwnerUid);
      if (uid !== clientUid && uid !== providerOwnerUid) {
        throw new AppError("FORBIDDEN", "이 채팅에 참여할 수 없어요");
      }
      const myKey = uid === clientUid ? "unreadByClient" : "unreadByProvider";
      tx.update(threadRef, { [myKey]: 0 });
    });

    return { ok: true, data: { threadId: input.threadId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
