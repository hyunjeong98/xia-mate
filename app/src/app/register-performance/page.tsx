"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, orderBy, query, where, Timestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

const PERFORMANCE_COLOR_OPTIONS = [
  { key: "red", label: "빨", swatch: "bg-red-500" },
  { key: "orange", label: "주", swatch: "bg-orange-500" },
  { key: "yellow", label: "노", swatch: "bg-yellow-400" },
  { key: "green", label: "초", swatch: "bg-green-500" },
  { key: "blue", label: "파", swatch: "bg-blue-500" },
  { key: "indigo", label: "남", swatch: "bg-indigo-500" },
  { key: "violet", label: "보", swatch: "bg-violet-500" },
  { key: "black", label: "검", swatch: "bg-zinc-900" },
];

interface Performance {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  color?: string;
}

export default function RegisterConcertPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [selectedColor, setSelectedColor] = useState("red");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Performance | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (!profile) return;
    getDocs(query(collection(db, "performances"), orderBy("startDate", "desc")))
      .then((snap) =>
        setPerformances(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Performance))
        )
      );
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const resetForm = () => {
    setTitle("");
    setStartDate("");
    setEndDate("");
    setVenue("");
    setSelectedColor("red");
    setSaved(false);
    setError(null);
  };

  const handleEdit = (p: Performance) => {
    setEditingId(p.id);
    setTitle(p.title);
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setVenue(p.venue);
    setSelectedColor(p.color || "red");
    setSaved(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDeleteClick = (p: Performance) => {
    setDeleteTarget(p);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const p = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(p.id);
    try {
      // 관련 스케줄 삭제
      const schedulesSnap = await getDocs(
        query(collection(db, "schedules"), where("performanceId", "==", p.id))
      );
      // 관련 관람내역 삭제
      const mySchedulesSnap = await getDocs(
        query(collection(db, "mySchedules"), where("performanceId", "==", p.id))
      );
      await Promise.all([
        ...schedulesSnap.docs.map((d) => deleteDoc(d.ref)),
        ...mySchedulesSnap.docs.map((d) => deleteDoc(d.ref)),
        deleteDoc(doc(db, "performances", p.id)),
      ]);
      setPerformances((prev) => prev.filter((item) => item.id !== p.id));
      if (editingId === p.id) {
        setEditingId(null);
        resetForm();
      }
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate || !venue) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (startDate > endDate) {
      setError("종료일이 시작일보다 빠를 수 없어요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateDoc(doc(db, "performances", editingId), {
          title, startDate, endDate, venue, color: selectedColor,
        });
        setPerformances((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? { ...p, title, startDate, endDate, venue, color: selectedColor }
              : p
          )
        );
        setEditingId(null);
      } else {
        const ref = await addDoc(collection(db, "performances"), {
          title,
          startDate,
          endDate,
          venue,
          color: selectedColor,
          createdAt: Timestamp.now(),
          createdBy: user!.uid,
        });
        const newItem: Performance = { id: ref.id, title, startDate, endDate, venue, color: selectedColor };
        setPerformances((prev) =>
          [newItem, ...prev].sort((a, b) => b.startDate.localeCompare(a.startDate))
        );
      }
      setSaved(true);
      resetForm();
    } catch (err: any) {
      setError(err.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
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
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          공연 등록
        </h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingId && (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">공연 수정 중</span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                취소
              </button>
            </div>
          )}

          {/* 공연명 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">
              공연명
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
              placeholder="예) XIA 2025 CONCERT XMAS"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:ring-rose-500/20"
            />
          </div>

          {/* 공연기간 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">
              공연기간
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setSaved(false); }}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-rose-500/20"
              />
              <span className="text-sm text-zinc-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setSaved(false); }}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-rose-500/20"
              />
            </div>
          </div>

          {/* 공연장 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">
              공연장
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => { setVenue(e.target.value); setSaved(false); }}
              placeholder="예) 올림픽공원 체조경기장"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:ring-rose-500/20"
            />
          </div>

          {/* 색상 */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">
              뱃지 색상
            </label>
            <div className="flex gap-2">
              {PERFORMANCE_COLOR_OPTIONS.map(({ key, swatch }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSelectedColor(key); setSaved(false); }}
                  className={`h-9 w-9 rounded-full transition-all active:scale-95 ${swatch} ${selectedColor === key
                    ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-950"
                    : "opacity-60 hover:opacity-100"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 저장 완료 */}
          {saved && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              {editingId ? "수정되었어요!" : "공연이 등록되었어요!"}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "저장 중..." : editingId ? "공연 수정하기" : "공연 등록하기"}
          </button>
        </form>

        {/* 공연 목록 */}
        {performances.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              등록된 공연 ({performances.length})
            </h2>
            <div className="space-y-2">
              {performances.map((p) => {
                const colorOption = PERFORMANCE_COLOR_OPTIONS.find((c) => c.key === p.color);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
                  >
                    <div className={`h-4 w-4 shrink-0 rounded-full ${colorOption?.swatch || "bg-zinc-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-white">{p.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {p.startDate} ~ {p.endDate}
                      </p>
                      <p className="text-xs text-zinc-400">{p.venue}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(p)}
                        disabled={deletingId === p.id}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        {deletingId === p.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              공연을 삭제할까요?
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                &ldquo;{deleteTarget.title}&rdquo;
              </span>
              을(를) 삭제하면 등록된 스케줄과 관람내역도 모두 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
