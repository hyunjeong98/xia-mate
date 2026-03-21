"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { collection, getDocs, query, where, deleteDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

interface Schedule {
  id: string;
  date: string;
  time: string;
  cast: string[];
}

interface Performance {
  title: string;
  venue: string;
  startDate: string;
  endDate: string;
  color?: string;
}

export default function ScheduleListPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const performanceId = params.performanceId as string;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCast, setEditCast] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (!profile || profile.email !== "dhdbs200@gmail.com" || !performanceId) return;

    const fetchData = async () => {
      const perfDoc = await getDoc(doc(db, "performances", performanceId));
      if (perfDoc.exists()) {
        setPerformance(perfDoc.data() as Performance);
      }

      const q = query(
        collection(db, "schedules"),
        where("performanceId", "==", performanceId)
      );
      const snap = await getDocs(q);
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Schedule, "id">) }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      setSchedules(items);
      setFetching(false);
    };
    fetchData();
  }, [profile, performanceId]);

  const handleEditStart = (s: Schedule) => {
    setEditingId(s.id);
    setEditCast(s.cast && s.cast.length > 0 ? [...s.cast] : [""]);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditSaving(true);
    try {
      const castFiltered = editCast.filter((c) => c.trim());
      await updateDoc(doc(db, "schedules", editingId), {
        cast: castFiltered,
      });
      // 관련 mySchedules의 cast도 업데이트
      const mySnap = await getDocs(
        query(collection(db, "mySchedules"), where("scheduleId", "==", editingId))
      );
      await Promise.all(
        mySnap.docs.map((d) =>
          updateDoc(d.ref, { cast: castFiltered })
        )
      );
      setSchedules((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, cast: castFiltered } : s))
      );
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || "수정 실패");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const s = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(s.id);
    try {
      // 관련 mySchedules도 삭제
      const mySnap = await getDocs(
        query(collection(db, "mySchedules"), where("scheduleId", "==", s.id))
      );
      await Promise.all([
        ...mySnap.docs.map((d) => deleteDoc(d.ref)),
        deleteDoc(doc(db, "schedules", s.id)),
      ]);
      setSchedules((prev) => prev.filter((item) => item.id !== s.id));
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

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
          onClick={() => router.push("/manage-schedule")}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">스케줄 목록</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-6 space-y-6">
        {/* 공연 정보 */}
        {performance && (
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <p className="font-bold text-zinc-900 dark:text-white">{performance.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {performance.venue} · {performance.startDate} ~ {performance.endDate}
            </p>
          </div>
        )}

        {/* 스케줄 추가 버튼 */}
        <Link
          href={`/manage-schedule/${performanceId}/add`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          스케줄 추가
        </Link>

        {/* 스케줄 목록 */}
        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">등록된 스케줄이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              등록된 스케줄 ({schedules.length})
            </p>
            {schedules.map((s) => (
              <div key={s.id} className="rounded-xl bg-white shadow-sm dark:bg-zinc-900">
                {editingId === s.id ? (
                  /* ── 수정 모드 ── */
                  <div className="space-y-3 p-4">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {s.date} · {s.time}
                    </p>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-zinc-500">캐스트</label>
                      <div className="space-y-1.5">
                        {editCast.map((actor, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={actor}
                              placeholder={`배역 ${idx + 1}`}
                              onChange={(e) => {
                                const next = [...editCast];
                                next[idx] = e.target.value;
                                setEditCast(next);
                              }}
                              className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            {editCast.length > 1 && (
                              <button
                                onClick={() => setEditCast((prev) => prev.filter((_, i) => i !== idx))}
                                className="shrink-0 text-zinc-300 hover:text-red-400"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditCancel}
                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleEditSave}
                        disabled={editSaving}
                        className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-600 disabled:opacity-40"
                      >
                        {editSaving ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── 보기 모드 ── */
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {s.date} · {s.time}
                      </p>
                      {s.cast && s.cast.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{s.cast.join(", ")}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleEditStart(s)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        disabled={deletingId === s.id}
                        className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-red-50 hover:text-rose-500 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              스케줄을 삭제할까요?
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {deleteTarget.date} {deleteTarget.time}
              </span>
              {" "}스케줄을 삭제하면 관련 관람내역도 함께 삭제됩니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
