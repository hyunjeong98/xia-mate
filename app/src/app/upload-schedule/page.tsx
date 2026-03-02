"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

interface Schedule {
  date: string;
  time: string;
  cast: string[];
}

interface Performance {
  id: string;
  title: string;
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

  // 공연 정보 관련 상태
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  // 공연 목록 가져오기
  useEffect(() => {
    if (!profile || profile.email !== "dhdbs200@gmail.com") return;

    const fetchPerformances = async () => {
      try {
        const q = query(collection(db, "performances"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title
        })) as Performance[];
        setPerformances(list);
      } catch (err) {
        console.error("Failed to fetch performances:", err);
      }
    };

    fetchPerformances();
  }, [profile]);

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
    if (!schedules || !user || !selectedPerformanceId) {
      setError("공연을 먼저 선택해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    const selectedPerf = performances.find(p => p.id === selectedPerformanceId);

    try {
      const batch = schedules.map((s) =>
        addDoc(collection(db, "schedules"), {
          performanceId: selectedPerformanceId,
          performanceTitle: selectedPerf?.title,
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

  const filteredPerformances = performances.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPerformance = performances.find(p => p.id === selectedPerformanceId);

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
          스케줄 업로드
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
          <div className="mb-4 space-y-6">
            {/* 공연 선택 영역 */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                1. 공연 선택
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {selectedPerformance ? selectedPerformance.title : "공연을 선택해주세요"}
                </button>

                {showDropdown && (
                  <div className="absolute top-full z-20 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                    <input
                      type="text"
                      placeholder="공연 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-800"
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredPerformances.length > 0 ? (
                        filteredPerformances.map((perf) => (
                          <button
                            key={perf.id}
                            onClick={() => {
                              setSelectedPerformanceId(perf.id);
                              setShowDropdown(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 ${selectedPerformanceId === perf.id ? "bg-rose-50 font-bold text-rose-500 dark:bg-rose-900/30" : ""
                              }`}
                          >
                            {perf.title}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-zinc-400">검색 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                2. 추출된 스케줄 ({schedules.length}건)
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
            </div>

            {saved ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 py-4 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                ✨ {selectedPerformance?.title} 스케줄 저장 완료!
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !selectedPerformanceId}
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
