"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import { format, parseISO } from "date-fns";

const PERFORMANCE_SWATCH_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
};

interface RankingEntry {
  userId: string;
  nickname: string;
  color: string;
  count: number;
}

interface PopularCastEntry {
  actor: string;
  count: number;
  total: number;
}

interface PerformanceStats {
  id: string;
  title: string;
  color?: string;
  totalSchedules: number;
  totalAttendance: number;
  topDate: string | null;
  ranking: RankingEntry[];
  popularCast: PopularCastEntry[];
}

export default function StatsPage() {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<PerformanceStats[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setFetching(true);
      try {
        const [perfSnap, schedSnap, mySnap] = await Promise.all([
          getDocs(query(collection(db, "performances"), orderBy("startDate", "desc"))),
          getDocs(collection(db, "schedules")),
          getDocs(collection(db, "mySchedules")),
        ]);

        const performances = perfSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        const schedules = schedSnap.docs.map((d) => d.data() as any);
        const mySchedules = mySnap.docs.map((d) => d.data() as any);

        const uniqueUserIds = [...new Set(mySchedules.map((m: any) => m.userId as string))];
        const userDocs = await Promise.all(
          uniqueUserIds.map((uid) => getDoc(doc(db, "users", uid)))
        );
        const userMap: Record<string, { nickname: string; color: string }> = {};
        userDocs.forEach((d) => {
          if (d.exists()) {
            userMap[d.id] = {
              nickname: d.data().nickname || "?",
              color: d.data().color || "bg-slate-400",
            };
          }
        });

        const result: PerformanceStats[] = performances.map((p: any) => {
          const perfSchedules = schedules.filter((s: any) => s.performanceId === p.id);
          const perfMy = mySchedules.filter((m: any) => m.performanceId === p.id);

          const countByUser: Record<string, number> = {};
          perfMy.forEach((m: any) => {
            countByUser[m.userId] = (countByUser[m.userId] || 0) + 1;
          });
          const ranking: RankingEntry[] = Object.entries(countByUser)
            .map(([userId, count]) => ({
              userId,
              nickname: userMap[userId]?.nickname || "?",
              color: userMap[userId]?.color || "bg-slate-400",
              count,
            }))
            .sort((a, b) => b.count - a.count);

          const countByDate: Record<string, number> = {};
          perfMy.forEach((m: any) => {
            if (m.date) countByDate[m.date] = (countByDate[m.date] || 0) + 1;
          });
          const topDate = Object.entries(countByDate).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          // Popular cast: per role index, find most-attended actor
          const popularCast: PopularCastEntry[] = [];
          if (perfMy.length > 0) {
            const maxLen = Math.max(0, ...perfMy.map((m: any) => (m.cast as string[] | undefined)?.length ?? 0));
            for (let i = 0; i < maxLen; i++) {
              const countByActor: Record<string, number> = {};
              let total = 0;
              perfMy.forEach((m: any) => {
                const actor = (m.cast as string[] | undefined)?.[i];
                if (actor) {
                  countByActor[actor] = (countByActor[actor] || 0) + 1;
                  total++;
                }
              });
              const top = Object.entries(countByActor).sort((a, b) => b[1] - a[1])[0];
              if (top) popularCast.push({ actor: top[0], count: top[1], total });
            }
          }

          return {
            id: p.id,
            title: p.title,
            color: p.color,
            totalSchedules: perfSchedules.length,
            totalAttendance: perfMy.length,
            topDate,
            ranking,
            popularCast,
          };
        });

        setStats(result);
      } finally {
        setFetching(false);
      }
    };

    fetchAll();
  }, [user]);

  if (loading || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const totalAttendances = stats.reduce((acc, curr) => acc + curr.totalAttendance, 0);

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
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">통계</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-8">
        {fetching ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm font-medium">등록된 공연이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Overall Summary */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-rose-500 p-8 text-white shadow-2xl shadow-rose-500/20">
              <div className="relative z-10">
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">총 관람 횟수</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-6xl font-black">{totalAttendances}</h2>
                  <span className="text-xl font-bold opacity-80">회</span>
                </div>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-rose-400/20 blur-3xl" />
            </div>

            {/* Performance Cards List */}
            <div className="space-y-6">
              {stats.map((s) => {
                const swatchClass = PERFORMANCE_SWATCH_CLASSES[s.color ?? ""] ?? "bg-zinc-400";
                const maxCount = s.ranking[0]?.count ?? 1;

                return (
                  <div key={s.id} className="group relative overflow-hidden rounded-4xl bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:bg-zinc-900">
                    {/* Header */}
                    <div className="mb-6 flex flex-col items-center gap-3">
                      <div className={`h-10 w-10 rounded-2xl ${swatchClass} flex items-center justify-center text-white shadow-lg shadow-${s.color}-500/20`}>
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight text-center">{s.title}</h4>
                    </div>

                    {/* Stats Grid */}
                    <div className="mb-8 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-zinc-50 p-4 text-center dark:bg-zinc-800/50">
                        <p className="text-xl font-black text-zinc-900 dark:text-white">{s.totalSchedules}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">공연 횟수</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4 text-center dark:bg-zinc-800/50">
                        <p className="text-xl font-black text-zinc-900 dark:text-white">{s.totalAttendance}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">관람 횟수</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4 text-center dark:bg-zinc-800/50">
                        <p className="text-xl font-black text-zinc-900 dark:text-white">
                          {s.topDate ? format(parseISO(s.topDate), "M/d") : "-"}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">최다 관람일</p>
                      </div>
                    </div>

                    {/* Ranking Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s.title} 향한 순정</h5>
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800 mx-4" />
                      </div>

                      {s.ranking.length === 0 ? (
                        <p className="py-2 text-center text-xs font-medium text-zinc-400">아직 기록이 없어요.</p>
                      ) : (
                        <div className="space-y-4">
                          {s.ranking.slice(0, 5).map((entry) => {
                            const rank = s.ranking.findIndex(e => e.count === entry.count) + 1;
                            return (
                            <div key={entry.userId} className="relative">
                              <div className="flex items-center gap-3">
                                {/* Rank & Avatar */}
                                <div className="relative shrink-0">
                                  <div className={`h-8 w-8 rounded-xl ${entry.color} flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>
                                    {entry.nickname.charAt(0)}
                                  </div>
                                  <div className={`absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-lg border-2 border-white bg-zinc-900 text-[8px] font-black text-white dark:border-zinc-900 ${rank === 1 ? "bg-amber-500" : ""
                                    }`}>
                                    {rank}
                                  </div>
                                </div>

                                <div className="flex-1">
                                  <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{entry.nickname}</span>
                                    <span className="text-[10px] font-black text-rose-500">{entry.count}회</span>
                                  </div>
                                  {/* Progress Bar */}
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                      className="h-full rounded-full bg-rose-400 transition-all duration-700 ease-out"
                                      style={{ width: `${(entry.count / maxCount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                          })}
                          {s.ranking.length > 5 && (
                            <p className="text-center text-[10px] font-bold text-zinc-400 pt-2">+ {s.ranking.length - 5} more friends</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Popular Cast Section */}
                    <div className="mt-6">
                      <div className="flex items-center mb-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">많이 본 캐스팅</h5>
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800 ml-4" />
                      </div>

                      {s.popularCast.length === 0 ? (
                        <p className="py-2 text-center text-xs font-medium text-zinc-400">캐스팅 데이터가 없어요.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {s.popularCast.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{entry.actor}</span>
                              <span className="text-[10px] text-zinc-400">{entry.count}/{entry.total}회</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
