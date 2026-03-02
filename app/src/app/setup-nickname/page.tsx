"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SetupNicknamePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile) {
        router.push("/");
      }
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    if (nickname.length < 2 || nickname.length > 10) {
      setError("닉네임은 2~10자 이내로 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await setDoc(doc(db, "users", user!.uid), {
        nickname: nickname.trim(),
        email: user!.email,
        photoURL: user!.photoURL,
        createdAt: new Date().toISOString(),
      });
      router.push("/");
    } catch (err) {
      console.error("Failed to save nickname:", err);
      setError("닉네임 저장에 실패했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">닉네임 설정</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
              className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-center text-zinc-900 focus:border-rose-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              maxLength={10}
              required
            />
            {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !nickname.trim()}
            className="w-full rounded-2xl bg-rose-500 p-4 font-bold text-white shadow-lg transition-all hover:bg-rose-600 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "저장 중..." : "시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
