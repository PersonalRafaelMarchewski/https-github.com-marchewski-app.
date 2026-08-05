"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { rescheduleSession } from "@/app/(trainer)/agenda/actions";
import { getHolidayName } from "@/lib/holidays";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const START_HOUR = 5;
const END_HOUR = 22;
const PX_PER_MIN = 1; // 1 minuto = 1px → cada hora tem 60px de altura
const DAY_COL_FALLBACK_WIDTH = 104; // usado só se a medição real falhar
const SNAP_MIN = 15; // arrastar encaixa em blocos de 15 minutos
const DRAG_THRESHOLD_PX = 6; // abaixo disso conta como clique, não arraste

type ViewMode = "day" | "3day" | "week" | "month";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "3day", label: "3 dias" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

type SessionRow = {
  id: string;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string;
  students: { profiles: { name: string } | null } | null;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setDate(1); // evita "rolar" pro mês seguinte em meses com menos dias
  d.setMonth(d.getMonth() + months);
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
  colWidth: number; // largura real da coluna no momento em que o arraste começou
};

export default function WeekAgenda() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date(), []);
  const dayColRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const numDaysShown = viewMode === "day" ? 1 : viewMode === "3day" ? 3 : viewMode === "week" ? 7 : 0;

  const rangeStart = useMemo(() => {
    if (viewMode === "week") return startOfWeek(anchorDate);
    if (viewMode === "month") return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    return startOfDay(anchorDate);
  }, [viewMode, anchorDate]);

  // grade do mês: dias em branco antes do dia 1 + todos os dias do mês
  const monthCells = useMemo(() => {
    if (viewMode !== "month") return [];
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
  }, [viewMode, anchorDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    const queryStart =
      viewMode === "month" ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1) : rangeStart;
    const queryEnd =
      viewMode === "month"
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
        : addDays(rangeStart, numDaysShown);

    supabase
      .from("training_sessions")
      .select("id, title, start_at, end_at, status, students:student_id (profiles:profile_id (name))")
      .gte("start_at", queryStart.toISOString())
      .lt("start_at", queryEnd.toISOString())
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
  }, [viewMode, anchorDate, rangeStart, numDaysShown]);

  const days = useMemo(
    () => (numDaysShown > 0 ? Array.from({ length: numDaysShown }, (_, i) => addDays(rangeStart, i)) : []),
    [rangeStart, numDaysShown]
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
    const colWidth = dayColRefs.current[dayIndex]?.getBoundingClientRect().width || DAY_COL_FALLBACK_WIDTH;
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
      colWidth,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;

    const deltaX = e.clientX - drag.pointerStartX;
    const deltaY = e.clientY - drag.pointerStartY;
    const moved = drag.moved || Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX;

    if (moved) e.preventDefault();

    const deltaDays = Math.round(deltaX / drag.colWidth);
    const snappedDeltaMin = Math.round(deltaY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;

    const maxStartMin = Math.max(0, (END_HOUR - START_HOUR) * 60 - drag.durationMin);
    const newStartMin = clamp(drag.originStartMin + snappedDeltaMin, 0, maxStartMin);
    const newDayIndex = clamp(drag.originDayIndex + deltaDays, 0, numDaysShown - 1);

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

  function goPrev() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "3day") setAnchorDate((d) => addDays(d, -3));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, -7));
    else setAnchorDate((d) => addMonths(d, -1));
  }

  function goNext() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "3day") setAnchorDate((d) => addDays(d, 3));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, 7));
    else setAnchorDate((d) => addMonths(d, 1));
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  function openDay(date: Date) {
    setAnchorDate(date);
    setViewMode("day");
  }

  const headerLabel =
    viewMode === "month"
      ? anchorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : viewMode === "day"
        ? anchorDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
        : (days[0] ?? anchorDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const gridMinWidth = 56 + numDaysShown * 110;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="min-w-[150px] text-center font-heading text-sm font-semibold capitalize text-navy">
              {headerLabel}
            </p>
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg p-1.5 text-blue hover:bg-lightblue/20"
              aria-label="Próximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-lightblue/50 px-2.5 py-1 text-xs font-medium text-blue hover:bg-lightblue/20"
          >
            Hoje
          </button>

          {saving && <span className="text-xs text-blue">Salvando...</span>}
        </div>

        <a href="/agenda/nova" className="self-start sm:self-auto">
          <span className="flex items-center justify-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange2">
            <Plus size={16} />
            Nova aula
          </span>
        </a>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setViewMode(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === opt.value ? "bg-navy text-white" : "bg-lightblue/15 text-blue hover:bg-lightblue/25"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {viewMode !== "month" && (
        <p className="mb-2 text-xs text-blue">
          Arraste uma aula pra mudar o dia ou o horário.{" "}
          <span className="text-orange">●</span> = feriado
        </p>
      )}

      {viewMode === "month" ? (
        <div className="rounded-xl border border-lightblue/30 bg-white p-3">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i} className="text-xs font-medium text-blue">
                {d}
              </div>
            ))}

            {monthCells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = sameDay(day, today);
              const holidayName = getHolidayName(dateKey(day));
              const daySessions = sessionsByDay.get(dateKey(day)) ?? [];

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openDay(day)}
                  title={holidayName ?? undefined}
                  className={`flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-left hover:bg-lightblue/10 ${
                    holidayName ? "bg-peach/20" : ""
                  } ${isToday ? "ring-2 ring-orange" : ""}`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-orange" : "text-navy"}`}>
                    {day.getDate()}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                      {daySessions.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.status === "canceled"
                              ? "bg-lightblue"
                              : s.status === "done"
                                ? "bg-blue"
                                : "bg-orange"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-lightblue/30 bg-white">
          <div className="flex" style={{ minWidth: `${gridMinWidth}px` }}>
            {/* coluna de horas */}
            <div className="sticky left-0 z-10 w-14 flex-none bg-white">
              <div className="h-12 border-b border-lightblue/20" />
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-lightblue/10 pr-2 pt-1 text-right text-[11px] text-blue"
                  style={{ height: `${60 * PX_PER_MIN}px` }}
                >
                  {h}h
                </div>
              ))}
            </div>

            {/* colunas dos dias */}
            {days.map((day, dayIndex) => {
              const isToday = sameDay(day, today);
              const daySessions = sessionsByDay.get(dateKey(day)) ?? [];
              const holidayName = getHolidayName(dateKey(day));

              return (
                <div
                  key={dayIndex}
                  ref={(el) => {
                    dayColRefs.current[dayIndex] = el;
                  }}
                  className="flex-1 border-l border-lightblue/10"
                  style={{ minWidth: `${DAY_COL_FALLBACK_WIDTH}px` }}
                >
                  <div
                    title={holidayName ?? undefined}
                    className={`flex h-12 flex-col items-center justify-center border-b border-lightblue/20 ${
                      isToday ? "bg-orange/10" : holidayName ? "bg-peach/25" : ""
                    }`}
                  >
                    <p className="text-[11px] font-medium text-blue">
                      {WEEKDAY_LABELS[day.getDay()]}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? "text-orange" : "text-navy"}`}>
                      {day.getDate()}
                    </p>
                    {holidayName && <span className="text-[9px] leading-none text-orange">●</span>}
                  </div>

                  <div
                    className="relative"
                    style={{
                      height: `${(END_HOUR - START_HOUR) * 60 * PX_PER_MIN}px`,
                      backgroundColor: holidayName ? "rgba(243,168,136,0.08)" : undefined,
                    }}
                  >
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
                        ? (drag!.currentDayIndex - drag!.originDayIndex) * drag!.colWidth
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
      )}

      {loading && <p className="mt-2 text-xs text-blue">Carregando...</p>}
      {!loading && viewMode !== "month" && sessions.length === 0 && (
        <p className="mt-2 text-xs text-blue">Nenhuma aula marcada nesse período.</p>
      )}
    </div>
  );
}
