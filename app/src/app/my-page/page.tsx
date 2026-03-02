"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import Sidebar from "@/components/Sidebar";

const COLOR_OPTIONS = [
  "bg-rose-400",
  "bg-pink-400",
  "bg-fuchsia-400",
  "bg-purple-400",
  "bg-violet-400",
  "bg-indigo-400",
  "bg-blue-400",
  "bg-sky-400",
  "bg-cyan-400",
  "bg-teal-400",
  "bg-emerald-400",
  "bg-green-400",
  "bg-lime-500",
  "bg-yellow-400",
  "bg-amber-400",
  "bg-orange-400",
  "bg-red-400",
  "bg-slate-400",
];

export default function MyPage() {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nicknameError, setNicknameError] = useState("");

  useEffect(() => {
    if (profile) {
      if (profile.nickname) setNickname(profile.nickname);
      if (profile.color) setSelectedColor(profile.color);
    }
  }, [profile]);

  if (loading || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 10) {
      setNicknameError("닉네임은 2~10자로 입력해주세요.");
      return;
    }
    setNicknameError("");
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { nickname: trimmed, color: selectedColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${saved ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}`}>
        <div className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          저장되었어요!
        </div>
      </div>
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
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          마이페이지
        </h1>
        <div className="w-10" />
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-8 space-y-8">
        {/* Profile Card */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white ${selectedColor}`}
          >
            {(nickname || profile.nickname)?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-zinc-900 dark:text-white">{nickname || profile.nickname}</p>
            <p className="text-sm text-zinc-500">{profile.email}</p>
          </div>
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setNicknameError(""); }}
            maxLength={10}
            placeholder="닉네임을 입력해주세요"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-rose-500/20"
          />
          {nicknameError && (
            <p className="text-xs text-red-500">{nicknameError}</p>
          )}
        </div>

        {/* Color Picker */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            뱃지 컬러
          </label>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => { setSelectedColor(value); setSaved(false); }}
                className={`h-9 w-9 rounded-full transition-all active:scale-95 ${value} ${
                  selectedColor === value
                    ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-950"
                    : "opacity-60 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </main>
    </div>
  );
}
