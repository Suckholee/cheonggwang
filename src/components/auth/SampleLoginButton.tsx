"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { signInWithEmail } from "@/app/actions/auth-actions";
import { Loader2 } from "lucide-react";

interface Props {
  username: string;
  displayName: string;
}

export function SampleLoginButton({ username, displayName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const email = `${username}@cheonggwang.auth`;
      const credential = await signInWithEmailAndPassword(clientAuth, email, "cheonggwang12!@");
      const idToken = await credential.user.getIdToken();
      const res = await signInWithEmail(idToken);
      if (res.ok) {
        window.location.href = "/";
      } else {
        alert("로그인 세션 연동 실패: " + res.message);
        setLoading(false);
      }
    } catch (err: any) {
      alert("인증 오류: " + (err.message || err));
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          연동 중...
        </>
      ) : (
        "로그인 연동"
      )}
    </button>
  );
}
