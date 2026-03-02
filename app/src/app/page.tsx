"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import Calendar from "@/components/Calendar";

interface Schedule {
  id: string;
  date: string;
  time: string;
  cast: string[];
  performanceTitle?: string;
  performanceId?: string;
  performanceColor?: string;
}

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [performanceColorMap, setPerformanceColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!profile) {
        router.push("/setup-nickname");
      }
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "performances")).then((snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const color = d.data().color;
        if (color) map[d.id] = color;
      });
      setPerformanceColorMap(map);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "schedules"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      setSchedules(scheduleList);
    });

    return () => unsubscribe();
  }, [user]);

  const schedulesWithColor = useMemo(() =>
    schedules.map((s) => ({
      ...s,
      performanceColor: s.performanceId ? performanceColorMap[s.performanceId] : undefined,
    })),
    [schedules, performanceColorMap]
  );

  if (loading || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-900">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={profile}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-black tracking-tighter text-rose-500">
          XIA MATE
        </h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-6">
        <div className="rounded-3xl bg-white p-2 dark:bg-zinc-900">
          <Calendar schedules={schedulesWithColor} />
        </div>
      </main>
    </div>
  );
}
