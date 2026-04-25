"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * v1.8 admin-console · §5.1 — admin 로그인 폼.
 *  - POST /api/admin/login { username, password, next? }
 *  - 성공 시 응답의 redirectTo로 이동
 *  - rate-limit 429 / 401 / 400 모두 동일 메시지로 단순화
 */
export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setError("잠시 후 다시 시도해주세요");
        } else {
          setError(json.message || "아이디 또는 비밀번호가 올바르지 않습니다");
        }
        return;
      }
      router.push(json.redirectTo ?? "/admin");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">ID</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          maxLength={64}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">PW</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            maxLength={128}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-12 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy || !username || !password}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "로그인 중…" : "로그인"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        ⓘ 운영자 전용. 일반 사용자 로그인은{" "}
        <a href="/login" className="underline">
          /login
        </a>
      </p>
    </form>
  );
}
