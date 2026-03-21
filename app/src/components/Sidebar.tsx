"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
}

export default function Sidebar({ isOpen, onClose, userProfile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on path change
  useEffect(() => {
    onClose();
  }, [pathname]); // onClose를 의존성에서 제거하여 부모 리랜더링 시 닫히는 문제 해결

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-zinc-900 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-xl font-black tracking-tighter text-rose-500">
              XIA MATE
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-4">
            <Link
              href="/"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === "/"
                ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              홈
            </Link>
            <Link
              href="/my-history"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname.startsWith("/my-history")
                ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              내 관람 내역
            </Link>
            <Link
              href="/stats"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === "/stats"
                ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              통계
            </Link>
            {userProfile?.email === "dhdbs200@gmail.com" && (
              <>
                <Link
                  href="/register-performance"
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === "/register-performance"
                    ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  공연 등록
                </Link>
                <Link
                  href="/admin-attendance"
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === "/admin-attendance"
                    ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  관람 내역 관리
                </Link>
                <Link
                  href="/upload-schedule"
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === "/upload-schedule"
                    ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  스케줄 업로드
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
            {/* User Profile Info */}
            <Link
              href="/my-page"
              className={`mb-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${pathname === "/my-page" ? "bg-zinc-50 dark:bg-zinc-800" : ""}`}
            >
              <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-white text-sm font-bold ${userProfile?.color || "bg-rose-500"}`}>
                {userProfile?.nickname?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                  {userProfile?.nickname}
                </p>
                <p className="truncate text-xs text-zinc-500">{userProfile?.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
