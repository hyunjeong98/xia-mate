"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

const PERFORMANCE_SWATCH_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
};

interface PerformanceGroup {
  performanceId: string;
  performanceTitle: string;
  color?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  count: number;
}

export default function MyHistoryPage() {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [groups, setGroups] = useState<PerformanceGroup[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setFetching(true);
      try {
        const mySnap = await getDocs(
          query(collection(db, "mySchedules"), where("userId", "==", user.uid))
        );
        const myDocs = mySnap.docs.map((d) => d.data() as any);

        // Group by performanceId
        const groupMap: Record<string, { title: string; count: number }> = {};
        myDocs.forEach((d: any) => {
          const pid = d.performanceId || "unknown";
          if (!groupMap[pid]) {
            groupMap[pid] = { title: d.performanceTitle || "알 수 없는 공연", count: 0 };
          }
          groupMap[pid].count++;
        });

        // Fetch performance colors
        const perfIds = Object.keys(groupMap).filter((id) => id !== "unknown");
        const perfDocs = await Promise.all(
          perfIds.map((id) => getDoc(doc(db, "performances", id)))
        );
        const perfInfoMap: Record<string, { color?: string; venue?: string; startDate?: string; endDate?: string }> = {};
        perfDocs.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            perfInfoMap[d.id] = {
              color: data.color,
              venue: data.venue,
              startDate: data.startDate,
              endDate: data.endDate,
            };
          }
        });

        const result: PerformanceGroup[] = Object.entries(groupMap)
          .map(([performanceId, { title, count }]) => ({
            performanceId,
            performanceTitle: title,
            color: perfInfoMap[performanceId]?.color,
            venue: perfInfoMap[performanceId]?.venue,
            startDate: perfInfoMap[performanceId]?.startDate,
            endDate: perfInfoMap[performanceId]?.endDate,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        setGroups(result);
      } catch (err) {
        console.error("Failed to fetch my history:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={profile}
      />

      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">내 관람 내역</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-8">
        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <svg className="mb-2 h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">관람 내역이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <Link
                key={g.performanceId}
                href={`/my-history/${g.performanceId}`}
                className="flex items-center justify-between rounded-2xl bg-white p-5 transition-all hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      g.color ? PERFORMANCE_SWATCH_CLASSES[g.color] || "bg-zinc-400" : "bg-zinc-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {g.performanceTitle}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                      {g.venue && <span>{g.venue}</span>}
                      {g.startDate && g.endDate && (
                        <span>{g.startDate} ~ {g.endDate}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-rose-500">{g.count}회</span>
                  <svg className="h-4 w-4 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
