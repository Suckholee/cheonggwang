import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

const COLLECTION = "slugs";
const col = () => adminDb.collection(COLLECTION);

export class SlugConflictError extends Error {
  constructor(public slug: string) {
    super(`SLUG_CONFLICT: ${slug}`);
    this.name = "SlugConflictError";
  }
}

/**
 * firebase-admin Firestore: `.create()`는 문서 존재 시 ALREADY_EXISTS (code 6) 에러.
 * gRPC status code 기준.
 */
function isAlreadyExists(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code = (e as { code?: string | number }).code;
  return code === 6 || code === "already-exists";
}

export const slugRepository = {
  async create(slug: string, pageId: string): Promise<void> {
    try {
      await col().doc(slug).create({
        pageId,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (isAlreadyExists(e)) throw new SlugConflictError(slug);
      throw e;
    }
  },

  async get(slug: string): Promise<{ pageId: string } | null> {
    const snap = await col().doc(slug).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return { pageId: d.pageId as string };
  },

  async delete(slug: string): Promise<void> {
    await col().doc(slug).delete();
  },
};
