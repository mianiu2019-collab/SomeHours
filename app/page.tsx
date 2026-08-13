"use client";
/* eslint-disable react-hooks/set-state-in-effect -- restore persisted client-only state after mount */

import { useEffect, useMemo, useState } from "react";

type FocusSession = {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  date: string;
};

type View = "focus" | "today" | "overview" | "day";
type Theme = "light" | "dark";

const SESSIONS_KEY = "minimal-focus-timer:sessions";
const ACTIVE_KEY = "minimal-focus-timer:active-start";
const THEME_KEY = "minimal-focus-timer:theme";
const OVERVIEW_DAYS = 14;
const OVERVIEW_SCALE_SECONDS = 8 * 60 * 60;

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayBounds(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const end = new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1).getTime();
  return { start, end };
}

function localDate(value: Date, offset = 0) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + offset);
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function formatHoursMinutes(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDayLabel(day: Date, includeWeekday = false) {
  return day.toLocaleDateString("en-US", {
    ...(includeWeekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
  }).toLowerCase().replace(",", " / ");
}

function mergedDuration(intervals: Array<[number, number]>) {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [start, end] = sorted[0];
  for (let index = 1; index < sorted.length; index += 1) {
    const [nextStart, nextEnd] = sorted[index];
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      total += end - start;
      start = nextStart;
      end = nextEnd;
    }
  }
  return total + end - start;
}

function mergedIntervals(intervals: Array<[number, number]>) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  let [start, end] = sorted[0];
  for (let index = 1; index < sorted.length; index += 1) {
    const [nextStart, nextEnd] = sorted[index];
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      merged.push([start, end]);
      start = nextStart;
      end = nextEnd;
    }
  }
  merged.push([start, end]);
  return merged;
}

function intervalsForDay(
  sessions: FocusSession[],
  activeStart: string | null,
  now: number,
  day: Date,
) {
  const bounds = dayBounds(day);
  const intervals: Array<[number, number]> = sessions.map((session) => [
    new Date(session.startTime).getTime(),
    new Date(session.endTime).getTime(),
  ]);
  if (activeStart) intervals.push([new Date(activeStart).getTime(), now]);
  return intervals
    .map(([start, end]) => [Math.max(start, bounds.start), Math.min(end, bounds.end)] as [number, number])
    .filter(([start, end]) => end > start);
}

function DayView({
  day,
  sessions,
  activeStart,
  now,
  isToday,
  onBack,
}: {
  day: Date;
  sessions: FocusSession[];
  activeStart: string | null;
  now: number;
  isToday: boolean;
  onBack?: () => void;
}) {
  const intervals = intervalsForDay(sessions, activeStart, now, day);
  const totalSeconds = mergedDuration(intervals) / 1000;
  const bounds = dayBounds(day);

  return (
    <div className="today-view">
      <header className="today-header">
        <p className="date-line">{formatDayLabel(day, true)}</p>
        <h1>{isToday ? "today" : "day log"}</h1>
        <p className="today-total"><span className="status-dot" />{formatClock(totalSeconds)} focused</p>
        {!isToday && onBack && (
          <button className="overview-back" type="button" onClick={onBack}>
            &gt; overview
          </button>
        )}
      </header>
      <div className="time-map" aria-label={`${formatDayLabel(day)}每小时的真实专注分布`}>
        {Array.from({ length: 24 }, (_, hour) => {
          const hourStart = bounds.start + hour * 60 * 60 * 1000;
          const hourEnd = hourStart + 60 * 60 * 1000;
          const segments = mergedIntervals(
            intervals
              .map(([start, end]) => [Math.max(start, hourStart), Math.min(end, hourEnd)] as [number, number])
              .filter(([start, end]) => end > start),
          );
          return (
            <div className={`hour-row ${hour < 6 ? "quiet-hour" : ""}`} key={hour}>
              <span className="hour-label">{String(hour).padStart(2, "0")}</span>
              <div className="hour-track">
                {segments.map(([start, end], index) => {
                  const left = ((start - hourStart) / (60 * 60 * 1000)) * 100;
                  const width = ((end - start) / (60 * 60 * 1000)) * 100;
                  const startMinute = Math.floor((start - hourStart) / 60000);
                  const endMinute = Math.min(60, Math.ceil((end - hourStart) / 60000));
                  return (
                    <span
                      className="focus-segment"
                      key={`${start}-${end}-${index}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${String(hour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}–${String(hour + (endMinute === 60 ? 1 : 0)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`}
                      aria-label={`${hour}点${startMinute}分至${endMinute === 60 ? `${hour + 1}点` : `${endMinute}分`}专注`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="today-footer">total / {formatClock(totalSeconds)}</p>
    </div>
  );
}

function Overview({
  days,
  sessions,
  activeStart,
  now,
  onSelect,
}: {
  days: Date[];
  sessions: FocusSession[];
  activeStart: string | null;
  now: number;
  onSelect: (day: Date) => void;
}) {
  return (
    <div className="overview-view">
      <header className="overview-header">
        <p className="date-line">recent / {OVERVIEW_DAYS} days</p>
        <h1>overview</h1>
      </header>
      <div className="daily-log" aria-label="最近十四天每日专注时长">
        {days.map((day) => {
          const seconds = mergedDuration(intervalsForDay(sessions, activeStart, now, day)) / 1000;
          const width = Math.min(100, (seconds / OVERVIEW_SCALE_SECONDS) * 100);
          const key = dateKey(day);
          return (
            <button
              className={`day-row ${seconds === 0 ? "zero-day" : ""}`}
              type="button"
              key={key}
              onClick={() => onSelect(day)}
              aria-label={`${formatDayLabel(day)}, 专注 ${formatClock(seconds)}`}
            >
              <span className="day-label">{formatDayLabel(day)}</span>
              <span className="day-trace" aria-hidden="true">
                {seconds > 0 && <span className="day-trace-fill" style={{ width: `${width}%` }} />}
              </span>
              <span className="day-duration">{formatHoursMinutes(seconds)}</span>
            </button>
          );
        })}
      </div>
      <p className="overview-scale">trace / 8h</p>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("focus");
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [activeStart, setActiveStart] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const today = useMemo(() => new Date(now), [now]);
  const overviewDays = useMemo(
    () => Array.from({ length: OVERVIEW_DAYS }, (_, index) => localDate(today, -index)),
    [today],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_KEY);
      const active = localStorage.getItem(ACTIVE_KEY);
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (stored) setSessions(JSON.parse(stored));
      if (active) setActiveStart(active);
      const initialTheme: Theme = storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      setTheme(initialTheme);
      document.documentElement.dataset.theme = initialTheme;
    } catch {
      localStorage.removeItem(SESSIONS_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dayIntervals = useMemo(
    () => intervalsForDay(sessions, activeStart, now, today),
    [sessions, activeStart, now, today],
  );
  const todaySeconds = mergedDuration(dayIntervals) / 1000;

  function startFocus() {
    const start = new Date().toISOString();
    localStorage.setItem(ACTIVE_KEY, start);
    setActiveStart(start);
    setNow(Date.now());
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  function endFocus() {
    if (!activeStart) return;
    const end = new Date();
    const start = new Date(activeStart);
    const session: FocusSession = {
      id: globalThis.crypto?.randomUUID?.() ?? `${start.getTime()}-${end.getTime()}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000)),
      date: dateKey(start),
    };
    const next = [...sessions, session];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    localStorage.removeItem(ACTIVE_KEY);
    setSessions(next);
    setActiveStart(null);
    setNow(end.getTime());
    setView("focus");
  }

  const elapsed = activeStart
    ? Math.max(0, (now - new Date(activeStart).getTime()) / 1000)
    : 0;

  if (!ready) return <main className="app-shell" aria-label="专注计时器" />;

  return (
    <main className={`app-shell ${activeStart && view === "focus" ? "is-running" : ""}`}>
      <section className="phone-frame">
        <button className="theme-switch" type="button" onClick={toggleTheme} aria-label={`切换到${theme === "dark" ? "日间" : "夜间"}模式`}>
          &gt; {theme === "dark" ? "light" : "dark"}
        </button>
        {view === "focus" ? (
          activeStart ? (
            <div className="running-view" aria-live="polite">
              <p className="eyebrow"><span className="status-dot" />focus / active</p>
              <div className="timer-stack">
                <time className="focus-clock">{formatClock(elapsed)}</time>
                <p className="running-total">today / {formatClock(todaySeconds)}</p>
              </div>
              <button className="end-button" type="button" onClick={endFocus}>
                &gt; stop
              </button>
            </div>
          ) : (
            <div className="start-view">
              <header>
                <p className="date-line">
                  {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toLowerCase()}
                </p>
                <h1>focus</h1>
              </header>
              <div className="total-block">
                <p>today / focused</p>
                <strong>{formatClock(todaySeconds)}</strong>
              </div>
              <button className="start-button" type="button" onClick={startFocus}>
                &gt; start focus
              </button>
            </div>
          )
        ) : view === "today" ? (
          <DayView day={today} sessions={sessions} activeStart={activeStart} now={now} isToday />
        ) : view === "day" && selectedDay ? (
          <DayView
            day={selectedDay}
            sessions={sessions}
            activeStart={activeStart}
            now={now}
            isToday={dateKey(selectedDay) === dateKey(today)}
            onBack={() => setView("overview")}
          />
        ) : (
          <Overview
            days={overviewDays}
            sessions={sessions}
            activeStart={activeStart}
            now={now}
            onSelect={(day) => {
              setSelectedDay(day);
              setView("day");
            }}
          />
        )}

        {!(activeStart && view === "focus") && (
          <nav className="bottom-nav" aria-label="主要导航">
            <button
              className={view === "focus" ? "active" : ""}
              type="button"
              onClick={() => setView("focus")}
            >
              focus
            </button>
            <button
              className={view === "today" ? "active" : ""}
              type="button"
              onClick={() => {
                setSelectedDay(null);
                setView("today");
              }}
            >
              today
            </button>
            <button
              className={view === "overview" || view === "day" ? "active" : ""}
              type="button"
              onClick={() => setView("overview")}
            >
              overview
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
