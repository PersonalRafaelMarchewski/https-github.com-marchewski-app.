"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { rescheduleSession } from "@/app/(trainer)/agenda/actions";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const START_HOUR = 5;
const END_HOUR = 22;
const PX_PER_MIN = 1; // 1 minuto = 1px → cada hora tem 60px de altura
const DAY_COL_WIDTH = 104; // precisa bater com a classe w-[104px] das colunas
const SNAP_MIN = 15; // arrastar encaixa em blocos de 15 minutos
const DRAG_THRESHOLD_PX = 6; // abaixo disso conta como clique, não arraste

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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatHM(startHourMinutes: number) {
  const h = Math.floor(startHourMinutes / 60);
  const m = startHourMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type DragState = {
  sessionId: string;
  durationMin: number;
  originDayIndex: number;
  originStartMin: number; // minutos desde START_HOUR
  pointerStartX: number;
  pointerStartY: number;
  currentDayIndex: number;
  currentStartMin: number;
  moved: boolean;
};

export default function WeekAgenda() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
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

  function minutesSinceStart(iso: string) {
    const d = new Date(iso);
    return (d.getHours() - START_HOUR) * 60 + d.getMinutes();
  }

  function durationOf(session: SessionRow) {
    return (new Date(session.end_at).getTime() - new Date(session.start_at).getTime()) / 60_000;
  }

  function handlePointerDown(e: React.PointerEvent, session: SessionRow, dayIndex: number) {
    if (e.button !== 0) return; // só botão esquerdo / toque
    setDrag({
      sessionId: session.id,
      durationMin: durationOf(session),
      originDayIndex: dayIndex,
      originStartMin: minutesSinceStart(session.start_at),
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      currentDayIndex: dayIndex,
      currentStartMin: minutesSinceStart(session.start_at),
      moved: false,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;

    const deltaX = e.clientX - drag.pointerStartX;
    const deltaY = e.clientY - drag.pointerStartY;
    const moved = drag.moved || Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX;

    if (moved) e.preventDefault();

    const deltaDays = Math.round(deltaX / DAY_COL_WIDTH);
    const snappedDeltaMin = Math.round(deltaY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;

    const maxStartMin = Math.max(0, (END_HOUR - START_HOUR) * 60 - drag.durationMin);
    const newStartMin = clamp(drag.originStartMin + snappedDeltaMin, 0, maxStartMin);
    const newDayIndex = clamp(drag.originDayIndex + deltaDays, 0, 6);

    setDrag((prev) =>
      prev ? { ...prev, moved, currentDayIndex: newDayIndex, currentStartMin: newStartMin } : prev
    );
  }

  async function handlePointerUp() {
    if (!drag) return;
    const finished = drag;
    setDrag(null);

    if (!finished.moved) return; // clique simples — o onClick cuida da navegação

    const newDay = days[finished.currentDayIndex];
    const newStart = new Date(newDay.getFullYear(), newDay.getMonth(), newDay.getDate(), 0, 0, 0, 0);
    newStart.setMinutes(START_HOUR * 60 + finished.currentStartMin);
    const newEnd = new Date(newStart.getTime() + finished.durationMin * 60_000);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === finished.sessionId
          ? { ...s, start_at: newStart.toISOString(), end_at: newEnd.toISOString() }
          : s
      )
    );

    setSaving(true);
    try {
      await rescheduleSession(finished.sessionId, newStart.toISOString(), finished.durationMin);
    } catch {
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleBlockClick(e: React.MouseEvent, sessionId: string, wasDragged: boolean) {
    e.preventDefault();
    if (wasDragged) return;
    router.push(`/agenda/${sessionId}/editar`);
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
          {saving && <span className="text-xs text-blue">Salvando...</span>}
        </div>

        <a href="/agenda/nova">
          <span className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2">
            <Plus size={16} />
            Nova aula
          </span>
        </a>
      </div>

      <p className="mb-2 text-xs text-blue">Arraste uma aula pra mudar o dia ou o horário.</p>

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
                <span className="absolute -top-[7px] right-2 bg-white pl-1 leading-none">{h}h</span>
              </div>
            ))}
          </div>

          {/* colunas dos dias */}
          {days.map((day, dayIndex) => {
            const isToday = sameDay(day, today);
            const daySessions = sessionsByDay.get(dateKey(day)) ?? [];

            return (
              <div key={dayIndex} className="w-[104px] flex-1 border-l border-lightblue/10">
                <div
                  className={`flex h-12 flex-col items-center justify-center border-b border-lightblue/20 ${
                    isToday ? "bg-orange/10" : ""
                  }`}
                >
                  <p className="text-[11px] font-medium text-blue">{WEEKDAY_LABELS[dayIndex]}</p>
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

                  {daySessions.map((s) => {
                    const isDraggingThis = drag?.sessionId === s.id;
                    const startMin = isDraggingThis ? drag!.currentStartMin : minutesSinceStart(s.start_at);
                    const durationMin = Math.max(20, durationOf(s));
                    const dayOffsetPx = isDraggingThis
                      ? (drag!.currentDayIndex - drag!.originDayIndex) * DAY_COL_WIDTH
                      : 0;

                    return (
                      <a
                        key={s.id}
                        href={`/agenda/${s.id}/editar`}
                        onClick={(e) => handleBlockClick(e, s.id, drag?.moved ?? false)}
                        onPointerDown={(e) => handlePointerDown(e, s, dayIndex)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={() => setDrag(null)}
                        className={`absolute left-0.5 right-0.5 touch-none overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[11px] leading-tight select-none ${
                          s.status === "canceled"
                            ? "border-lightblue bg-lightblue/10 text-blue line-through"
                            : s.status === "done"
                              ? "border-blue bg-blue/10 text-blue"
                              : "border-orange bg-orange/15 text-navy"
                        } ${isDraggingThis ? "cursor-grabbing" : "cursor-grab"}`}
                        style={{
                          top: `${startMin * PX_PER_MIN}px`,
                          height: `${durationMin * PX_PER_MIN}px`,
                          transform: dayOffsetPx ? `translateX(${dayOffsetPx}px)` : undefined,
                          opacity: isDraggingThis ? 0.85 : 1,
                          boxShadow: isDraggingThis ? "0 6px 16px rgba(31,37,86,0.35)" : undefined,
                          zIndex: isDraggingThis ? 20 : undefined,
                        }}
                      >
                        <p className="font-semibold">
                          {isDraggingThis
                            ? formatHM(START_HOUR * 60 + drag!.currentStartMin)
                            : new Date(s.start_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </p>
                        <p className="truncate">
                          {s.students?.profiles?.name ?? "Aluno"}
                          {s.title ? ` · ${s.title}` : ""}
                        </p>
                      </a>
                    );
                  })}
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
