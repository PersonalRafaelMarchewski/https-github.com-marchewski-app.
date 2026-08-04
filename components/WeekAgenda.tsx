"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const START_HOUR = 5;
const END_HOUR = 21;
const PX_PER_MIN = 1; // 1 minuto = 1px → cada hora tem 60px de altura

type SessionRow = {
  id: string;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string;
  students: { profiles: { name: string } | null } | null;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function WeekAgenda() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    const rangeStart = weekStart;
    const rangeEnd = addDays(weekStart, 7);

    supabase
      .from("training_sessions")
      .select("id, title, start_at, end_at, status, students:student_id (profiles:profile_id (name))")
      .gte("start_at", rangeStart.toISOString())
      .lt("start_at", rangeEnd.toISOString())
      .order("start_at")
      .then(({ data }) => {
        if (!cancelled) {
          setSessions((data as any) ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const key = dateKey(new Date(s.start_at));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  function blockStyle(session: SessionRow) {
    const start = new Date(session.start_at);
    const end = new Date(session.end_at);
    const startMin = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const durationMin = Math.max(20, (end.getTime() - start.getTime()) / 60_000);
    return {
      top: `${startMin * PX_PER_MIN}px`,
      height: `${durationMin * PX_PER_MIN}px`,
    };
  }

  const monthLabel = weekStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="font-heading text-sm font-semibold capitalize text-navy">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
            aria-label="Próxima semana"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="ml-1 rounded-lg border border-lightblue/50 px-2.5 py-1 text-xs font-medium text-blue hover:bg-lightblue/20"
          >
            Hoje
          </button>
        </div>

        <Link href="/agenda/nova">
          <span className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2">
            <Plus size={16} />
            Nova aula
          </span>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-lightblue/30 bg-white">
        <div className="flex min-w-[720px]">
          {/* coluna de horas */}
          <div className="sticky left-0 z-10 w-14 flex-none bg-white">
            <div className="h-12 border-b border-lightblue/20" />
            {hours.map((h) => (
              <div
                key={h}
                className="relative border-b border-lightblue/10 text-right text-[11px] text-blue"
                style={{ height: `${60 * PX_PER_MIN}px` }}
              >
                <span className="absolute -top-2 right-2">{h}h</span>
              </div>
            ))}
          </div>

          {/* colunas dos dias */}
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            const daySessions = sessionsByDay.get(dateKey(day)) ?? [];

            return (
              <div key={i} className="w-[104px] flex-1 border-l border-lightblue/10">
                <div
                  className={`flex h-12 flex-col items-center justify-center border-b border-lightblue/20 ${
                    isToday ? "bg-orange/10" : ""
                  }`}
                >
                  <p className="text-[11px] font-medium text-blue">{WEEKDAY_LABELS[i]}</p>
                  <p className={`text-sm font-bold ${isToday ? "text-orange" : "text-navy"}`}>
                    {day.getDate()}
                  </p>
                </div>

                <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 60 * PX_PER_MIN}px` }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-lightblue/10"
                      style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN}px` }}
                    />
                  ))}

                  {daySessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/agenda/${s.id}/editar`}
                      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[11px] leading-tight ${
                        s.status === "canceled"
                          ? "border-lightblue bg-lightblue/10 text-blue line-through"
                          : s.status === "done"
                            ? "border-blue bg-blue/10 text-blue"
                            : "border-orange bg-orange/15 text-navy"
                      }`}
                      style={blockStyle(s)}
                    >
                      <p className="font-semibold">
                        {new Date(s.start_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="truncate">
                        {s.students?.profiles?.name ?? "Aluno"}
                        {s.title ? ` · ${s.title}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <p className="mt-2 text-xs text-blue">Carregando...</p>}
      {!loading && sessions.length === 0 && (
        <p className="mt-2 text-xs text-blue">Nenhuma aula marcada nessa semana.</p>
      )}
    </div>
  );
}
