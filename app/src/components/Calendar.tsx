"use client";

import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { collection, addDoc, getDocs, getDoc, query, where, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

const AVATAR_COLORS = [
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

interface AttendeeInfo {
  initial: string;
  nickname: string;
  userId: string;
  color: string;
}
const PERFORMANCE_BADGE_CLASSES: Record<string, string> = {
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400",
  green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  black: "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
};

const DEFAULT_BADGE_CLASS = "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300";

interface Schedule {
  id: string;
  date: string;
  time: string;
  cast: string[];
  performanceTitle?: string;
  performanceId?: string;
  performanceColor?: string;
}

interface CalendarProps {
  schedules: Schedule[];
}

export default function Calendar({ schedules }: CalendarProps) {
  const { user, profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  // scheduleId -> docId 맵으로 변경
  const [mySchedulesMap, setMySchedulesMap] = useState<Record<string, string>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [attendeesByDate, setAttendeesByDate] = useState<Record<string, AttendeeInfo[]>>({});
  const [attendeesBySchedule, setAttendeesBySchedule] = useState<Record<string, AttendeeInfo[]>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "mySchedules"), where("userId", "==", user.uid));
    getDocs(q).then((snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach(d => {
        map[d.data().scheduleId] = d.id;
      });
      setMySchedulesMap(map);
    });
  }, [user]);

  useEffect(() => {
    const fetchAttendees = async () => {
      const snap = await getDocs(collection(db, "mySchedules"));
      const docs = snap.docs.map(d => d.data() as any);

      const uniqueUserIds = [...new Set(docs.map(d => d.userId as string))];
      const profileDocs = await Promise.all(
        uniqueUserIds.map(uid => getDoc(doc(db, "users", uid)))
      );

      const userInfoMap: Record<string, { initial: string; nickname: string; color: string }> = {};
      profileDocs.forEach((d, i) => {
        if (d.exists()) {
          const nickname = d.data().nickname || "?";
          userInfoMap[d.id] = {
            initial: nickname.charAt(0),
            nickname,
            color: d.data().color || AVATAR_COLORS[i % AVATAR_COLORS.length],
          };
        }
      });

      const byDate: Record<string, AttendeeInfo[]> = {};
      const bySchedule: Record<string, AttendeeInfo[]> = {};

      docs.forEach(d => {
        const info = userInfoMap[d.userId];
        if (!info) return;
        const attendee: AttendeeInfo = { ...info, userId: d.userId };

        if (d.date) {
          if (!byDate[d.date]) byDate[d.date] = [];
          if (!byDate[d.date].some(a => a.userId === d.userId)) {
            byDate[d.date].push(attendee);
          }
        }

        if (d.scheduleId) {
          if (!bySchedule[d.scheduleId]) bySchedule[d.scheduleId] = [];
          bySchedule[d.scheduleId].push(attendee);
        }
      });

      setAttendeesByDate(byDate);
      setAttendeesBySchedule(bySchedule);
    };

    fetchAttendees();
  }, []);

  const handleToggleMySchedule = async (s: Schedule) => {
    if (!user || addingId) return;
    setAddingId(s.id);

    const existingDocId = mySchedulesMap[s.id];
    const nickname = profile?.nickname || "?";
    const color = profile?.color || AVATAR_COLORS[0];
    const myAttendee: AttendeeInfo = { initial: nickname.charAt(0), nickname, userId: user.uid, color };

    try {
      if (existingDocId) {
        await deleteDoc(doc(db, "mySchedules", existingDocId));
        const newMap = { ...mySchedulesMap };
        delete newMap[s.id];
        setMySchedulesMap(newMap);

        setAttendeesBySchedule(prev => ({
          ...prev,
          [s.id]: (prev[s.id] || []).filter(a => a.userId !== user.uid),
        }));

        const hasOtherOnSameDate = Object.keys(newMap).some(schedId =>
          schedules.find(sc => sc.id === schedId)?.date === s.date
        );
        if (!hasOtherOnSameDate) {
          setAttendeesByDate(prev => ({
            ...prev,
            [s.date]: (prev[s.date] || []).filter(a => a.userId !== user.uid),
          }));
        }
      } else {
        const docRef = await addDoc(collection(db, "mySchedules"), {
          userId: user.uid,
          scheduleId: s.id,
          performanceId: (s as any).performanceId ?? null,
          performanceTitle: s.performanceTitle ?? null,
          date: s.date,
          time: s.time,
          cast: s.cast,
          createdAt: Timestamp.now(),
        });
        setMySchedulesMap(prev => ({ ...prev, [s.id]: docRef.id }));

        setAttendeesBySchedule(prev => ({
          ...prev,
          [s.id]: [...(prev[s.id] || []), myAttendee],
        }));
        setAttendeesByDate(prev => {
          const current = prev[s.date] || [];
          if (current.some(a => a.userId === user.uid)) return prev;
          return { ...prev, [s.date]: [...current, myAttendee] };
        });
      }
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
    } finally {
      setAddingId(null);
    }
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const scheduleMap = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    const filtered = showOnlyMine ? schedules.filter(s => mySchedulesMap[s.id]) : schedules;
    filtered.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [schedules, showOnlyMine, mySchedulesMap]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedSchedules = selectedDateStr ? scheduleMap[selectedDateStr] || [] : [];

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between px-2">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h2>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => setShowOnlyMine(prev => !prev)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${showOnlyMine
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors ${showOnlyMine
                    ? "border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-400"
                    : "border-zinc-300 bg-transparent dark:border-zinc-600"
                  }`}
              >
                {showOnlyMine && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              내 관극
            </button>
          )}
          <button
            onClick={prevMonth}
            className="rounded-xl p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="rounded-xl p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider text-zinc-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySchedules = scheduleMap[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`relative flex min-h-[70px] cursor-pointer flex-col p-0.5 transition-colors md:min-h-[80px] md:p-2 ${!isCurrentMonth
                ? "bg-zinc-50/50 opacity-30 dark:bg-zinc-950/50"
                : isSelected
                  ? "z-10 bg-rose-50 dark:bg-rose-500/10"
                  : "bg-white dark:bg-zinc-900"
                }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center text-xs font-bold md:h-7 md:w-7 md:text-sm ${isToday
                  ? "rounded-full bg-rose-500 text-white"
                  : isCurrentMonth
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400"
                  }`}
              >
                {format(day, "d")}
              </span>

              <div className="space-y-0.5">
                {daySchedules.map((s, idx) => (
                  <div
                    key={idx}
                    className={`rounded-md py-0.5 text-center text-[9px] font-black md:text-[10px] ${s.performanceColor
                        ? PERFORMANCE_BADGE_CLASSES[s.performanceColor] ?? DEFAULT_BADGE_CLASS
                        : DEFAULT_BADGE_CLASS
                      }`}
                  >
                    {s.performanceTitle}
                  </div>
                ))}
              </div>

              {(!showOnlyMine || daySchedules.length > 0) && (attendeesByDate[dateStr] || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {attendeesByDate[dateStr].map(({ initial, userId, color }) => (
                    <span
                      key={userId}
                      className={`flex h-4 w-4 items-center justify-center rounded-md text-[8px] font-black text-white ${color}`}
                    >
                      {initial}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Section */}
      <div className="mt-8 space-y-4 px-2">
        {selectedDate && (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
              </h3>
              <span className="text-xs font-bold text-rose-500">
                {selectedSchedules.length}개의 공연
              </span>
            </div>

            {selectedSchedules.length > 0 ? (
              <div className="space-y-3">
                {selectedSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="group relative overflow-hidden rounded-2xl bg-zinc-50 p-5 transition-all hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-zinc-900 dark:text-white">
                          {s.time}
                        </span>
                        {s.performanceTitle && (
                          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                            {s.performanceTitle}
                          </span>
                        )}
                      </div>
                      {user && (
                        <button
                          onClick={() => handleToggleMySchedule(s)}
                          disabled={addingId === s.id}
                          className={`flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold transition-all active:scale-95 ${mySchedulesMap[s.id]
                            ? "bg-rose-500 text-white"
                            : "bg-white text-zinc-400 border border-zinc-200 hover:border-rose-400 hover:text-rose-500 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-rose-500/50"
                            }`}
                        >
                          {mySchedulesMap[s.id] ? (
                            <span>
                              {s.date > format(new Date(), "yyyy-MM-dd") ? "관람 예정" : "관람 완료"}
                            </span>
                          ) : addingId === s.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-rose-500" />
                          ) : (
                            <span>관극 추가</span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.cast.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    {(attendeesBySchedule[s.id] || []).length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-zinc-400">함께 관람</span>
                        <div className="flex flex-wrap gap-1.5">
                          {attendeesBySchedule[s.id].map(({ nickname, userId, color }) => (
                            <span
                              key={userId}
                              className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${color}`}
                            >
                              {nickname}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                <svg className="mb-2 h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">공연 정보가 없습니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
