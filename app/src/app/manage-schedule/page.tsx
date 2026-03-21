"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

const COLOR_SWATCHES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  black: "bg-zinc-900",
};

interface Performance {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  color?: string;
}

export default function ManageSchedulePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (!profile || profile.email !== "dhdbs200@gmail.com") return;
    getDocs(query(collection(db, "performances"), orderBy("startDate", "desc")))
      .then((snap) =>
        setPerformances(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Performance))
        )
      )
      .finally(() => setFetching(false));
  }, [profile]);

  if (loading || !profile || profile.email !== "dhdbs200@gmail.com") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} userProfile={profile} />

      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">스케줄 관리</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-6">
        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : performances.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">등록된 공연이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {performances.map((p) => (
              <Link
                key={p.id}
                href={`/manage-schedule/${p.id}`}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
              >
                <div className={`h-4 w-4 shrink-0 rounded-full ${COLOR_SWATCHES[p.color || "red"] || "bg-zinc-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-white">{p.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.venue} · {p.startDate} ~ {p.endDate}
                  </p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
