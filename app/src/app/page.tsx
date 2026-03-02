"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!profile) {
        router.push("/setup-nickname");
      }
    }
  }, [user, profile, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <h1 className="text-xl font-black tracking-tighter text-rose-500">
          XIA MATE
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{profile.nickname}님</span>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="rounded-3xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-400">
            공연 기간이 아닙니다.<br />곧 새로운 소식을 가져올게요!
          </p>
        </div>
      </main>

      {/* Bottom Nav Placeholder */}
      <nav className="sticky bottom-0 border-t border-zinc-100 bg-white/80 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-xs justify-around text-xs font-medium text-zinc-400">
          <div className="flex flex-col items-center gap-1 text-rose-500">
            <div className="h-6 w-6 rounded-full bg-rose-500/10 p-1">
              <svg fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </div>
            홈
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 p-1">
              <svg fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>
            </div>
            기록
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 p-1">
              <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            친구
          </div>
        </div>
      </nav>
    </div>
  );
}
