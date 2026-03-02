"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

interface Performance {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
}

export default function RegisterConcertPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);

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
      );
  }, [profile]);

  if (loading || !profile || profile.email !== "dhdbs200@gmail.com") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

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
      const ref = await addDoc(collection(db, "performances"), {
        title,
        startDate,
        endDate,
        venue,
        createdAt: Timestamp.now(),
        createdBy: user!.uid,
      });
      const newItem: Performance = { id: ref.id, title, startDate, endDate, venue };
      setPerformances((prev) =>
        [newItem, ...prev].sort((a, b) => b.startDate.localeCompare(a.startDate))
      );
      setSaved(true);
      setTitle("");
      setStartDate("");
      setEndDate("");
      setVenue("");
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

          {/* 에러 */}
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 저장 완료 */}
          {saved && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              공연이 등록되었어요!
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "등록 중..." : "공연 등록하기"}
          </button>
        </form>
        {/* 공연 목록 */}
        {performances.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              등록된 공연 ({performances.length})
            </h2>
            <div className="space-y-2">
              {performances.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
                >
                  <p className="font-semibold text-zinc-900 dark:text-white">{p.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.startDate} ~ {p.endDate}
                  </p>
                  <p className="text-xs text-zinc-400">{p.venue}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
