"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

interface Schedule {
  date: string;
  time: string;
  cast: string[];
}

export default function UploadSchedulePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  if (loading || !profile || profile.email !== "dhdbs200@gmail.com") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImageFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
    setSchedules(null);
    setError(null);
    setSaved(false);
  };

  const handleExtract = async () => {
    if (!imageFiles.length) return;
    setExtracting(true);
    setError(null);
    setSchedules(null);
    setSaved(false);

    try {
      const formData = new FormData();
      imageFiles.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/extract-schedule", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "추출 실패");
      }

      const data = await res.json();
      setSchedules(data.schedules);
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했어요.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!schedules || !user) return;
    setSaving(true);
    setError(null);

    try {
      const batch = schedules.map((s) =>
        addDoc(collection(db, "schedules"), {
          date: s.date,
          time: s.time,
          cast: s.cast,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
        })
      );
      await Promise.all(batch);
      setSaved(true);
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
          공연정보 업로드
        </h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-8">
        {/* 이미지 업로드 영역 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mb-4 cursor-pointer rounded-2xl border-2 border-dashed border-zinc-200 bg-white transition-colors hover:border-rose-300 hover:bg-rose-50/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-rose-500/50"
        >
          {previewUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 p-2">
              {previewUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`업로드 이미지 ${i + 1}`}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center">
              <svg className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-zinc-400">이미지를 클릭해서 업로드</p>
              <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">여러 장 선택 가능</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 추출 버튼 */}
        <button
          onClick={handleExtract}
          disabled={!imageFiles.length || extracting}
          className="mb-6 w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {extracting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              추출 중...
            </div>
          ) : "스케줄 정보 추출하기"}
        </button>

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 추출 결과 */}
        {schedules && (
          <div className="mb-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              추출된 스케줄 ({schedules.length}건)
            </h2>
            <div className="space-y-2">
              {schedules.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {s.date} {s.time}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {s.cast.join(", ")}
                  </p>
                </div>
              ))}
            </div>

            {saved ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 py-4 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                ✨ 데이터베이스 저장 완료!
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? "저장 중..." : "최종 업데이트 하기"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
