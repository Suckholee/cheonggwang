export type AppErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PAGE_NOT_FOUND"
  | "SLUG_CONFLICT"
  | "RATE_LIMITED"
  | "LLM_FAILURE"
  | "STORAGE_ERROR"
  | "APP_CHECK_FAILED"
  | "ALREADY_REGISTERED"
  | "INVALID_STATE"
  | "ALREADY_QUOTED"
  | "ALREADY_ACCEPTED"
  // v1.6 community-feed-3panel (AI 고객 스토리 파이프라인)
  | "HYGIENE_FAIL"
  | "VISION_FETCH"
  | "TIMEOUT"
  // v1.7 partner-promo
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "STATUS_CONFLICT"
  | "STORAGE_FAIL"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly details?: Record<string, unknown>;
  constructor(
    public code: AppErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.details = details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string };

export function actionError(
  code: AppErrorCode,
  message: string
): ActionResult<never> {
  return { ok: false, code, message };
}

export function toActionError(e: unknown): ActionResult<never> {
  if (isAppError(e)) return { ok: false, code: e.code, message: e.message };
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다" };
  }
  return {
    ok: false,
    code: "INTERNAL_ERROR",
    message: e instanceof Error ? e.message : "일시적 오류가 발생했습니다",
  };
}

function errorMessageIncludes(e: unknown, pattern: string): boolean {
  return e instanceof Error && e.message.toLowerCase().includes(pattern);
}

export function isFirestoreIndexError(e: unknown): boolean {
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? (e as { code?: unknown }).code
      : undefined;
  return (
    code === 9 ||
    code === "9" ||
    code === "failed-precondition" ||
    code === "FAILED_PRECONDITION" ||
    errorMessageIncludes(e, "requires an index") ||
    errorMessageIncludes(e, "query requires an index")
  );
}

export function getAdminDataErrorMessage(e: unknown): string {
  if (isFirestoreIndexError(e)) {
    return "Firestore 인덱스가 아직 배포되지 않았습니다. `firebase deploy --only firestore:indexes` 후 다시 확인해주세요.";
  }
  return "데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}
