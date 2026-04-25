import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { verifySessionCookie } from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_NAME } from "@/domain/constants";
import { adminStorage, getStorageBucketName } from "@/lib/firebase/admin";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { storyScrapbookRepository } from "@/lib/firebase/story-scrapbook-repository";
import { cleanupStoryPhotos } from "@/lib/llm/story-cleanup";
import { AppError, type AppErrorCode } from "@/lib/errors";

const MAX_PHOTOS = 5;
const MAX_BYTES_PER_PHOTO = 5 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp)$/;
const DAILY_LIMIT = 5; // v1.6 Phase 4.5: 스크랩 저장 자체는 여유 있게 허용 (배치가 결국 묶어 처리)
const DAY_MS = 24 * 60 * 60 * 1000;

interface ValidatedUpload {
  buffers: Array<{ buffer: Buffer; mimeType: string; ext: string }>;
  memo: string | null;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function validateFormData(form: FormData): Promise<ValidatedUpload> {
  const raw = form.getAll("photos");
  if (raw.length === 0) {
    throw new AppError("INVALID_INPUT", "사진을 1장 이상 올려주세요");
  }
  if (raw.length > MAX_PHOTOS) {
    throw new AppError(
      "INVALID_INPUT",
      `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요`,
    );
  }
  const buffers: ValidatedUpload["buffers"] = [];
  for (const entry of raw) {
    if (!(entry instanceof File)) {
      throw new AppError("INVALID_INPUT", "파일 형식이 올바르지 않습니다");
    }
    if (entry.size > MAX_BYTES_PER_PHOTO) {
      throw new AppError("INVALID_INPUT", "사진은 5MB 이하로 올려주세요");
    }
    if (!ALLOWED_MIME.test(entry.type)) {
      throw new AppError("INVALID_INPUT", "JPG · PNG · WebP 형식만 지원해요");
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    buffers.push({ buffer, mimeType: entry.type, ext: extFromMime(entry.type) });
  }
  const memoRaw = form.get("memo") ?? form.get("caption");
  const memo =
    typeof memoRaw === "string" && memoRaw.trim().length > 0
      ? memoRaw.trim().slice(0, 200)
      : null;
  return { buffers, memo };
}

async function uploadPhotosToStorage(
  uid: string,
  storyId: string,
  buffers: ValidatedUpload["buffers"],
): Promise<string[]> {
  const bucket = adminStorage.bucket(getStorageBucketName());
  // v1.6 Phase 4.5: Vercel 서버리스 환경에서 `storage.googleapis.com/{bucket}/{path}` 직접 URL이
  // 403을 반환하는 문제 확인 (uniform bucket-level access 또는 ACL propagation 지연).
  // signed URL(10년 만료)로 전환 — 작성된 URL은 Firestore에 저장되어 AI 파이프라인(Vision fetch)와
  // 공개 피드(og:image·<img src>) 양쪽에서 사용되므로 공개 읽기 가능해야 함.
  const SIGNED_URL_EXPIRES_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10년
  const urls: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const { buffer, mimeType, ext } = buffers[i];
    const filename = `${i}-${nanoid(6)}.${ext}`;
    const filePath = `stories/${uid}/${storyId}/${filename}`;
    const file = bucket.file(filePath);
    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRES_MS,
    });
    urls.push(signedUrl);
  }
  return urls;
}

export async function POST(request: NextRequest) {
  let uid = "";
  let storyId = "";
  let uploadedPhotos: string[] = [];
  try {
    const jar = await cookies();
    uid = await verifySessionCookie(jar.get(SESSION_COOKIE_NAME)?.value);

    await checkAndIncrement(`scrapbook:${uid}`, DAILY_LIMIT, DAY_MS);

    const form = await request.formData();
    const { buffers, memo } = await validateFormData(form);

    storyId = nanoid(12);
    uploadedPhotos = await uploadPhotosToStorage(uid, storyId, buffers);

    const itemId = nanoid(16);
    await storyScrapbookRepository.create(itemId, {
      ownerUid: uid,
      photoUrls: uploadedPhotos,
      storyId,
      memo,
    });

    return NextResponse.json(
      {
        itemId,
        storyId,
        status: "pending",
        message: "스크랩북에 저장됐어요. 블로그 글은 하루 안에 자동으로 만들어집니다.",
      },
      { status: 201 },
    );
  } catch (e) {
    if (uid && storyId && uploadedPhotos.length > 0) {
      cleanupStoryPhotos(uid, storyId).catch((err) =>
        console.warn("[stories/scrapbook] cleanup failed", err),
      );
    }
    return handleError(e);
  }
}

function jsonError(status: number, code: AppErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function handleError(e: unknown) {
  if (e instanceof AppError) {
    return jsonError(mapStatus(e.code), e.code, e.message);
  }
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return jsonError(401, "UNAUTHORIZED", "로그인이 필요합니다");
  }
  console.error("[stories/scrapbook] internal", e);
  const message = e instanceof Error ? e.message : "일시적 오류가 발생했습니다";
  return jsonError(500, "INTERNAL_ERROR", message);
}

function mapStatus(code: AppErrorCode): number {
  switch (code) {
    case "INVALID_INPUT":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "RATE_LIMITED":
      return 429;
    default:
      return 500;
  }
}
