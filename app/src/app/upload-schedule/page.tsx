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
  const [mode, setMode] = useState<"image" | "manual">("image");

  // 공연 목록
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 이미지 추출 모드 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [extractedSchedules, setExtractedSchedules] = useState<Schedule[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSaved, setImageSaved] = useState(false);

  // 직접 입력 모드 상태
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualCast, setManualCast] = useState<string[]>([""]);
  const [manualSchedules, setManualSchedules] = useState<Schedule[]>([]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile && profile.email !== "dhdbs200@gmail.com") {
      router.replace("/");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (!profile || profile.email !== "dhdbs200@gmail.com") return;
    const fetchPerformances = async () => {
      const q = query(collection(db, "performances"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPerformances(snap.docs.map((d) => ({ id: d.id, title: d.data().title })));
    };
    fetchPerformances();
  }, [profile]);

  if (loading || !profile || profile.email !== "dhdbs200@gmail.com") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const filteredPerformances = performances.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedPerformance = performances.find((p) => p.id === selectedPerformanceId);

  // ── 이미지 추출 모드 핸들러 ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImageFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
    setExtractedSchedules(null);
    setImageError(null);
    setImageSaved(false);
  };

  const handleExtract = async () => {
    if (!imageFiles.length) return;
    setExtracting(true);
    setImageError(null);
    setExtractedSchedules(null);
    setImageSaved(false);
    try {
      const formData = new FormData();
      imageFiles.forEach((f) => formData.append("images", f));
      const res = await fetch("/api/extract-schedule", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "추출 실패");
      }
      const data = await res.json();
      setExtractedSchedules(data.schedules);
    } catch (err: any) {
      setImageError(err.message || "알 수 없는 오류가 발생했어요.");
    } finally {
      setExtracting(false);
    }
  };

  const handleImageSave = async () => {
    if (!extractedSchedules || !user || !selectedPerformanceId) {
      setImageError("공연을 먼저 선택해주세요.");
      return;
    }
    setImageSaving(true);
    setImageError(null);
    try {
      await Promise.all(
        extractedSchedules.map((s) =>
          addDoc(collection(db, "schedules"), {
            performanceId: selectedPerformanceId,
            performanceTitle: selectedPerformance?.title,
            date: s.date,
            time: s.time,
            cast: s.cast,
            createdAt: Timestamp.now(),
            createdBy: user.uid,
          })
        )
      );
      setImageSaved(true);
    } catch (err: any) {
      setImageError(err.message || "저장 실패");
    } finally {
      setImageSaving(false);
    }
  };

  // ── 직접 입력 모드 핸들러 ──
  const handleAddManual = () => {
    if (!manualDate || !manualTime) {
      setManualError("날짜와 시간을 입력해주세요.");
      return;
    }
    setManualError(null);
    setManualSchedules((prev) => [
      ...prev,
      { date: manualDate, time: manualTime, cast: manualCast.filter((c) => c.trim()) },
    ]);
    setManualTime("");
    setManualCast([""]);
  };

  const handleManualSave = async () => {
    if (!user || !selectedPerformanceId) {
      setManualError("공연을 먼저 선택해주세요.");
      return;
    }
    if (manualSchedules.length === 0) {
      setManualError("등록할 스케줄이 없어요.");
      return;
    }
    setManualSaving(true);
    setManualError(null);
    try {
      await Promise.all(
        manualSchedules.map((s) =>
          addDoc(collection(db, "schedules"), {
            performanceId: selectedPerformanceId,
            performanceTitle: selectedPerformance?.title,
            date: s.date,
            time: s.time,
            cast: s.cast,
            createdAt: Timestamp.now(),
            createdBy: user.uid,
          })
        )
      );
      setManualSaved(true);
      setManualSchedules([]);
      setManualDate("");
      setManualTime("");
      setManualCast([""]);
    } catch (err: any) {
      setManualError(err.message || "저장 실패");
    } finally {
      setManualSaving(false);
    }
  };

  // 공연 선택 드롭다운 (공용)
  const PerformanceSelector = () => (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">공연 선택</label>
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
              className="mb-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-base outline-none dark:border-zinc-800 dark:bg-zinc-800"
            />
            <div className="max-h-48 overflow-y-auto">
              {filteredPerformances.length > 0 ? (
                filteredPerformances.map((perf) => (
                  <button
                    key={perf.id}
                    onClick={() => { setSelectedPerformanceId(perf.id); setShowDropdown(false); }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 ${selectedPerformanceId === perf.id ? "bg-rose-50 font-bold text-rose-500 dark:bg-rose-900/30" : ""}`}
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
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} userProfile={profile} />

      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-zinc-900/80">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">스케줄 업로드</h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-6 space-y-6">
        {/* 탭 */}
        <div className="flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setMode("image")}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${mode === "image" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
          >
            이미지 추출
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${mode === "manual" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
          >
            직접 입력
          </button>
        </div>

        {/* ── 이미지 추출 모드 ── */}
        {mode === "image" && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-zinc-200 bg-white transition-colors hover:border-rose-300 hover:bg-rose-50/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-rose-500/50"
            >
              {previewUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 p-2">
                  {previewUrls.map((url, i) => (
                    <img key={i} src={url} alt={`업로드 이미지 ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
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
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

            <button
              onClick={handleExtract}
              disabled={!imageFiles.length || extracting}
              className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {extracting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  추출 중...
                </span>
              ) : "스케줄 정보 추출하기"}
            </button>

            {imageError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{imageError}</div>
            )}

            {extractedSchedules && (
              <div className="space-y-6">
                <PerformanceSelector />

                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    추출된 스케줄 ({extractedSchedules.length}건)
                  </h2>
                  <div className="space-y-2">
                    {extractedSchedules.map((s, i) => (
                      <div key={i} className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
                        <p className="font-semibold text-zinc-900 dark:text-white">{s.date} {s.time}</p>
                        <p className="mt-1 text-xs text-zinc-500">{s.cast.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {imageSaved ? (
                  <div className="rounded-2xl bg-emerald-50 py-4 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    ✨ {selectedPerformance?.title} 스케줄 저장 완료!
                  </div>
                ) : (
                  <button
                    onClick={handleImageSave}
                    disabled={imageSaving || !selectedPerformanceId}
                    className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {imageSaving ? "저장 중..." : "최종 업데이트 하기"}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 직접 입력 모드 ── */}
        {mode === "manual" && (
          <>
            <PerformanceSelector />

            {/* 스케줄 입력 폼 */}
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4 dark:bg-zinc-900">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">스케줄 추가</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">날짜</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-500">시간</label>
                  <input
                    type="text"
                    placeholder="예: 14:00, 마티네"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* 캐스트 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500">캐스트</label>
                  <button
                    onClick={() => setManualCast((prev) => [...prev, ""])}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600"
                  >
                    + 배역 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {manualCast.map((actor, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center text-[10px] font-black text-zinc-400">{idx + 1}</span>
                      <input
                        type="text"
                        placeholder={`배역 ${idx + 1} 배우 이름`}
                        value={actor}
                        onChange={(e) => {
                          const next = [...manualCast];
                          next[idx] = e.target.value;
                          setManualCast(next);
                        }}
                        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                      {manualCast.length > 1 && (
                        <button
                          onClick={() => setManualCast((prev) => prev.filter((_, i) => i !== idx))}
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

              <button
                onClick={handleAddManual}
                className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98]"
              >
                목록에 추가
              </button>
            </div>

            {manualError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{manualError}</div>
            )}

            {/* 추가된 스케줄 목록 */}
            {manualSchedules.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  추가된 스케줄 ({manualSchedules.length}건)
                </p>
                {manualSchedules.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{s.date} · {s.time}</p>
                      {s.cast.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{s.cast.join(", ")}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setManualSchedules((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-zinc-300 hover:text-red-400"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {manualSaved ? (
                  <div className="rounded-2xl bg-emerald-50 py-4 text-center text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    ✨ {selectedPerformance?.title} 스케줄 저장 완료!
                  </div>
                ) : (
                  <button
                    onClick={handleManualSave}
                    disabled={manualSaving || !selectedPerformanceId}
                    className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {manualSaving ? "저장 중..." : `${manualSchedules.length}개 스케줄 저장하기`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
