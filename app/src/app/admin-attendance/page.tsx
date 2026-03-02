"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, getDocs, query, orderBy, where,
  addDoc, deleteDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

const PERFORMANCE_SWATCH_CLASSES: Record<string, string> = {
  red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-400",
  green: "bg-green-500", blue: "bg-blue-500",
  indigo: "bg-indigo-500", violet: "bg-violet-500",
};

interface UserProfile {
  uid: string;
  nickname: string;
  email: string;
  color: string;
}

interface Schedule {
  id: string;
  date: string;
  time: string;
  cast: string[];
  performanceId?: string;
  performanceTitle?: string;
}

interface Performance {
  id: string;
  title: string;
  color?: string;
}

interface MyScheduleDoc {
  docId: string;
  userId: string;
  scheduleId: string;
  date: string;
  time: string;
  performanceTitle?: string;
  performanceId?: string;
}

export default function AdminAttendancePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "add">("list");

  // Shared data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [myScheduleDocs, setMyScheduleDocs] = useState<MyScheduleDoc[]>([]);
  const [fetching, setFetching] = useState(true);

  // Add mode state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [existingScheduleIds, setExistingScheduleIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Delete state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Collapse state (tracks expanded users; default = all collapsed)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const toggleCollapse = (uid: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  const loadAll = async () => {
    setFetching(true);
    try {
      const [userSnap, schedSnap, perfSnap, mySnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "schedules"), orderBy("date", "asc"))),
        getDocs(collection(db, "performances")),
        getDocs(collection(db, "mySchedules")),
      ]);
      setUsers(
        userSnap.docs.map((d) => ({
          uid: d.id,
          nickname: d.data().nickname || "?",
          email: d.data().email || "",
          color: d.data().color || "bg-zinc-400",
        }))
      );
      setSchedules(
        schedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule))
      );
      setPerformances(
        perfSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Performance))
      );
      setMyScheduleDocs(
        mySnap.docs.map((d) => ({
          docId: d.id,
          userId: d.data().userId,
          scheduleId: d.data().scheduleId,
          date: d.data().date,
          time: d.data().time,
          performanceTitle: d.data().performanceTitle ?? undefined,
          performanceId: d.data().performanceId ?? undefined,
        }))
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!profile || profile.email !== "dhdbs200@gmail.com") return;
    loadAll();
  }, [profile]);

  // Add mode: select user
  const handleSelectUser = async (uid: string) => {
    setSelectedUserId(uid);
    setCheckedIds(new Set());
    setSavedCount(null);
    setLoadingUser(true);
    try {
      const snap = await getDocs(
        query(collection(db, "mySchedules"), where("userId", "==", uid))
      );
      const ids = new Set(snap.docs.map((d) => d.data().scheduleId as string));
      setExistingScheduleIds(ids);
    } finally {
      setLoadingUser(false);
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
    if (!selectedUserId || checkedIds.size === 0) return;
    setSaving(true);
    setSavedCount(null);
    try {
      const toAdd = schedules.filter(
        (s) => checkedIds.has(s.id) && !existingScheduleIds.has(s.id)
      );
      const refs = await Promise.all(
        toAdd.map((s) =>
          addDoc(collection(db, "mySchedules"), {
            userId: selectedUserId,
            scheduleId: s.id,
            performanceId: s.performanceId ?? null,
            performanceTitle: s.performanceTitle ?? null,
            date: s.date,
            time: s.time,
            cast: s.cast,
            createdAt: Timestamp.now(),
          })
        )
      );
      // Update local state
      const newDocs: MyScheduleDoc[] = toAdd.map((s, i) => ({
        docId: refs[i].id,
        userId: selectedUserId,
        scheduleId: s.id,
        date: s.date,
        time: s.time,
        performanceTitle: s.performanceTitle,
        performanceId: s.performanceId,
      }));
      setMyScheduleDocs((prev) => [...prev, ...newDocs]);
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

  const handleDelete = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      await deleteDoc(doc(db, "mySchedules", docId));
      setMyScheduleDocs((prev) => prev.filter((d) => d.docId !== docId));
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading || !profile || profile.email !== "dhdbs200@gmail.com") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const perfMap = Object.fromEntries(performances.map((p) => [p.id, p]));
  const schedulesByDate = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(schedulesByDate).sort();
  const selectedUser = users.find((u) => u.uid === selectedUserId);

  // Group myScheduleDocs by user (only users with records)
  const usersWithRecords = users
    .map((u) => ({
      user: u,
      docs: myScheduleDocs
        .filter((d) => d.userId === u.uid)
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .filter((g) => g.docs.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={profile}
      />

      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <button
          onClick={() => {
            if (mode === "add") {
              setMode("list");
              setSelectedUserId(null);
              setCheckedIds(new Set());
              setSavedCount(null);
            } else {
              setIsSidebarOpen(true);
            }
          }}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {mode === "add" ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          {mode === "add" ? "관람 추가" : "관람 내역 관리"}
        </h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-6 space-y-5">

        {/* ── LIST MODE ── */}
        {mode === "list" && (
          <>
            {/* Add button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMode("add")}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                관람 추가
              </button>
              <span className="text-xs font-medium text-zinc-400">
                총 {myScheduleDocs.length}건
              </span>
            </div>

            {fetching ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
              </div>
            ) : usersWithRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <p className="text-sm font-medium">관람 내역이 없어요.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {usersWithRecords.map(({ user: u, docs }) => {
                  const isCollapsed = !expandedUsers.has(u.uid);
                  return (
                  <div key={u.uid} className="rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
                    {/* User header — clickable to collapse */}
                    <button
                      onClick={() => toggleCollapse(u.uid)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white ${u.color}`}>
                        {u.nickname.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{u.nickname}</p>
                        <p className="text-xs text-zinc-400">{docs.length}건</p>
                      </div>
                      <svg
                        className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Schedule list */}
                    {!isCollapsed && (
                    <div className="divide-y divide-zinc-50 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                      {docs.map((d) => {
                        const perf = d.performanceId ? perfMap[d.performanceId] : null;
                        const swatchClass = perf?.color
                          ? PERFORMANCE_SWATCH_CLASSES[perf.color] ?? "bg-zinc-400"
                          : "bg-zinc-400";
                        const isDeleting = deletingDocId === d.docId;

                        return (
                          <div
                            key={d.docId}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <div className={`h-2 w-2 shrink-0 rounded-full ${swatchClass}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                {format(parseISO(d.date), "M/d(EEE)", { locale: ko })}
                                <span className="ml-2 font-normal text-zinc-500">{d.time}</span>
                              </p>
                              {d.performanceTitle && (
                                <p className="mt-0.5 text-xs text-zinc-400 truncate">{d.performanceTitle}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDelete(d.docId)}
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
            {/* Step 1: 유저 선택 */}
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                1. 유저 선택
              </label>
              <div className="space-y-1.5">
                {users.map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => handleSelectUser(u.uid)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                      selectedUserId === u.uid
                        ? "bg-zinc-900 dark:bg-white"
                        : "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${u.color}`}>
                      {u.nickname.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${selectedUserId === u.uid ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-white"}`}>
                        {u.nickname}
                      </p>
                      <p className={`truncate text-xs ${selectedUserId === u.uid ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400"}`}>
                        {u.email}
                      </p>
                    </div>
                    {selectedUserId === u.uid && (
                      <svg className="h-4 w-4 shrink-0 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: 스케줄 선택 */}
            {selectedUserId && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  2. 스케줄 선택
                  {selectedUser && (
                    <span className="ml-2 normal-case font-normal text-zinc-400">
                      — {selectedUser.nickname}의 관람 일정 추가
                    </span>
                  )}
                </label>

                {loadingUser ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
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
                              const perf = s.performanceId ? perfMap[s.performanceId] : null;
                              const swatchClass = perf?.color
                                ? PERFORMANCE_SWATCH_CLASSES[perf.color] ?? "bg-zinc-400"
                                : "bg-zinc-400";

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
                                  <div className={`h-2 w-2 shrink-0 rounded-full ${swatchClass}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                      {s.time}
                                      {s.performanceTitle && (
                                        <span className="ml-2 font-normal text-zinc-500">{s.performanceTitle}</span>
                                      )}
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
              </div>
            )}

            {/* 저장 버튼 */}
            {selectedUserId && !loadingUser && (
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
                      ? `${selectedUser?.nickname}의 일정 ${checkedIds.size}개 등록하기`
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
