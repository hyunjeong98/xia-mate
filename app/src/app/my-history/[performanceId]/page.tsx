"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface Schedule {
  id: string;
  date: string;
  time: string;
  cast: string[];
  performanceId?: string;
  performanceTitle?: string;
}

interface MyScheduleDoc {
  docId: string;
  scheduleId: string;
  date: string;
  time: string;
  cast: string[];
}

export default function PerformanceHistoryPage() {
  const { performanceId } = useParams<{ performanceId: string }>();
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [performanceTitle, setPerformanceTitle] = useState("");
  const [mode, setMode] = useState<"list" | "add">("list");

  // List mode
  const [myDocs, setMyDocs] = useState<MyScheduleDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Add mode
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [existingScheduleIds, setExistingScheduleIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const loadMyDocs = async () => {
    if (!user || !performanceId) return;
    setFetching(true);
    try {
      const perfDoc = await getDoc(doc(db, "performances", performanceId));
      if (perfDoc.exists()) {
        setPerformanceTitle(perfDoc.data().title || "");
      }

      const mySnap = await getDocs(
        query(
          collection(db, "mySchedules"),
          where("userId", "==", user.uid),
          where("performanceId", "==", performanceId)
        )
      );
      const docs: MyScheduleDoc[] = mySnap.docs
        .map((d) => ({
          docId: d.id,
          scheduleId: d.data().scheduleId,
          date: d.data().date,
          time: d.data().time,
          cast: d.data().cast || [],
        }))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });
      setMyDocs(docs);
      setExistingScheduleIds(new Set(docs.map((d) => d.scheduleId)));
    } catch (err) {
      console.error("Failed to fetch my history:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user || !performanceId) return;
    loadMyDocs();
  }, [user, performanceId]);

  const handleEnterAddMode = async () => {
    setMode("add");
    setCheckedIds(new Set());
    setSavedCount(null);
    setLoadingSchedules(true);
    try {
      const schedSnap = await getDocs(
        query(collection(db, "schedules"), where("performanceId", "==", performanceId))
      );
      const schedList: Schedule[] = schedSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Schedule))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });
      setSchedules(schedList);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const toggleCheck = (id: string) => {
    if (existingScheduleIds.has(id)) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || checkedIds.size === 0) return;
    setSaving(true);
    setSavedCount(null);
    try {
      const toAdd = schedules.filter(
        (s) => checkedIds.has(s.id) && !existingScheduleIds.has(s.id)
      );
      const refs = await Promise.all(
        toAdd.map((s) =>
          addDoc(collection(db, "mySchedules"), {
            userId: user.uid,
            scheduleId: s.id,
            performanceId: s.performanceId ?? null,
            performanceTitle: s.performanceTitle ?? performanceTitle ?? null,
            date: s.date,
            time: s.time,
            cast: s.cast,
            createdAt: Timestamp.now(),
          })
        )
      );
      const newDocs: MyScheduleDoc[] = toAdd.map((s, i) => ({
        docId: refs[i].id,
        scheduleId: s.id,
        date: s.date,
        time: s.time,
        cast: s.cast,
      }));
      setMyDocs((prev) =>
        [...prev, ...newDocs].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        })
      );
      setExistingScheduleIds((prev) => {
        const next = new Set(prev);
        toAdd.forEach((s) => next.add(s.id));
        return next;
      });
      setCheckedIds(new Set());
      setSavedCount(toAdd.length);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string, scheduleId: string) => {
    setDeletingDocId(docId);
    try {
      await deleteDoc(doc(db, "mySchedules", docId));
      setMyDocs((prev) => prev.filter((d) => d.docId !== docId));
      setExistingScheduleIds((prev) => {
        const next = new Set(prev);
        next.delete(scheduleId);
        return next;
      });
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");

  // Group schedules by date for add mode
  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(schedulesByDate).sort();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={profile}
      />

      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        {mode === "add" ? (
          <button
            onClick={() => { setMode("list"); setSavedCount(null); }}
            className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <Link
            href="/my-history"
            className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          {mode === "add" ? "관람 추가" : performanceTitle || "관람 내역"}
        </h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-6 space-y-5">

        {/* ── LIST MODE ── */}
        {mode === "list" && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={handleEnterAddMode}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                관람 추가
              </button>
              <span className="text-xs font-medium text-zinc-400">
                총 {myDocs.length}건
              </span>
            </div>

            {fetching ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
              </div>
            ) : myDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <p className="text-sm font-medium">관람 내역이 없어요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myDocs.map((d) => {
                  const isPast = d.date <= today;
                  const isDeleting = deletingDocId === d.docId;

                  return (
                    <div
                      key={d.docId}
                      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                            {format(parseISO(d.date), "M월 d일 (EEE)", { locale: ko })}
                          </p>
                          <span className="text-sm text-zinc-500">{d.time}</span>
                          <span className={`text-[10px] font-bold ${isPast ? "text-zinc-400" : "text-rose-500"}`}>
                            {isPast ? "관람 완료" : "관람 예정"}
                          </span>
                        </div>
                        {d.cast.length > 0 && (
                          <p className="mt-1 truncate text-xs text-zinc-400">{d.cast.join(", ")}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(d.docId, d.scheduleId)}
                        disabled={isDeleting}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        {isDeleting ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-red-500" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── ADD MODE ── */}
        {mode === "add" && (
          <>
            {loadingSchedules ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
              </div>
            ) : schedules.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">등록된 스케줄이 없어요.</p>
            ) : (
              <div className="space-y-4">
                {sortedDates.map((date) => {
                  const daySchedules = schedulesByDate[date];
                  return (
                    <div key={date}>
                      <p className="mb-1.5 text-xs font-bold text-zinc-400">
                        {format(parseISO(date), "M월 d일 (EEE)", { locale: ko })}
                      </p>
                      <div className="space-y-1.5">
                        {daySchedules.map((s) => {
                          const alreadyHas = existingScheduleIds.has(s.id);
                          const isChecked = checkedIds.has(s.id);

                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleCheck(s.id)}
                              disabled={alreadyHas}
                              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                                alreadyHas
                                  ? "cursor-not-allowed bg-zinc-100 opacity-50 dark:bg-zinc-800/50"
                                  : isChecked
                                    ? "bg-rose-50 ring-2 ring-rose-400 dark:bg-rose-500/10"
                                    : "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                                alreadyHas
                                  ? "border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700"
                                  : isChecked
                                    ? "border-rose-500 bg-rose-500"
                                    : "border-zinc-300 dark:border-zinc-600"
                              }`}>
                                {(alreadyHas || isChecked) && (
                                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                  {s.time}
                                </p>
                                {s.cast.length > 0 && (
                                  <p className="mt-0.5 truncate text-xs text-zinc-400">{s.cast.join(", ")}</p>
                                )}
                              </div>
                              {alreadyHas && (
                                <span className="shrink-0 text-[10px] font-bold text-zinc-400">등록됨</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 저장 버튼 */}
            {!loadingSchedules && schedules.length > 0 && (
              <div className="sticky bottom-6">
                {savedCount !== null && (
                  <div className="mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {savedCount}개 일정이 등록되었어요!
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || checkedIds.size === 0}
                  className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:opacity-40"
                >
                  {saving
                    ? "등록 중..."
                    : checkedIds.size > 0
                      ? `${checkedIds.size}개 일정 등록하기`
                      : "스케줄을 선택해주세요"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
