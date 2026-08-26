"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Bell, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { rescheduleSession } from "@/app/(trainer)/agenda/actions";
import { formatTimeInBrazil } from "@/lib/date";
import { getHolidayName } from "@/lib/holidays";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const START_HOUR = 5;
const END_HOUR = 22;
const PX_PER_MIN = 1; // 1 minuto = 1px → cada hora tem 60px de altura
const DAY_COL_FALLBACK_WIDTH = 104; // usado só se a medição real falhar
const SNAP_MIN = 15; // arrastar encaixa em blocos de 15 minutos
const DRAG_THRESHOLD_PX = 6; // abaixo disso conta como clique, não arraste
const SWIPE_THRESHOLD_PX = 70; // arrastar mais que isso na horizontal troca de período
const LONG_PRESS_MS = 350; // precisa segurar parado esse tanto antes de "pegar" a aula

type ViewMode = "list" | "day" | "3day" | "week" | "month";

// "Programação" é a lista corrida do Google Agenda: os próximos dias com
// compromisso, um embaixo do outro, sem grade — a melhor visão no celular.
const LIST_DAYS = 30;

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "list", label: "Programação" },
  { value: "day", label: "Dia" },
  { value: "3day", label: "3 dias" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

// Texto escuro só nas cores claras (Banana/amarelo) — nas outras 10 da
// paleta o branco tem contraste de sobra, igual o Google faz.
function eventTextColor(hex: string | null | undefined): string {
  if (!hex) return "#FFFFFF"; // laranja padrão do app → branco
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1F2556" : "#FFFFFF";
}

const DEFAULT_EVENT_HEX = "#ED5B35"; // orange da marca

type SessionRow = {
  id: string;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string;
  color: string | null;
  students: { profiles: { name: string } | null } | null;
};

type ReminderRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
};

type BirthdayStudent = {
  id: string;
  name: string;
  birth_date: string; // "YYYY-MM-DD"
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [birthdayStudents, setBirthdayStudents] = useState<BirthdayStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ today: 0, week: 0, month: 0 });
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);
  const today = useMemo(() => new Date(), []);
  // relógio pro tracinho vermelho do "agora" (igual o Google) — atualiza
  // a cada minuto enquanto a agenda estiver aberta
  const [now, setNow] = useState(() => new Date());
  const nowLineRef = useRef<HTMLDivElement | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const dayColRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const justSwipedRef = useRef(false);
  // "clicar e segurar" pra pegar a aula — enquanto espera o tempo de
  // segurar, um toque rápido (só querendo abrir) não deve mover nada
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHoldRef = useRef<{
    sessionId: string;
    dayIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const numDaysShown =
    viewMode === "day" ? 1
    : viewMode === "3day" ? 3
    : viewMode === "week" ? 7
    : viewMode === "list" ? LIST_DAYS // a Programação busca (e lista) os próximos 30 dias
    : 0;

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
    setLoadError(false);

    const supabase = createClient();
    const queryStart =
      viewMode === "month" ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1) : rangeStart;
    const queryEnd =
      viewMode === "month"
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
        : addDays(rangeStart, numDaysShown);

    const queryStartDate = dateKey(queryStart);
    const queryEndDate = dateKey(addDays(queryEnd, -1));

    Promise.all([
      supabase
        .from("training_sessions")
        .select(
          "id, title, start_at, end_at, status, color, students:student_id (profiles:profile_id (name))"
        )
        .gte("start_at", queryStart.toISOString())
        .lt("start_at", queryEnd.toISOString())
        .order("start_at"),
      supabase
        .from("agenda_reminders")
        .select("id, title, start_date, end_date")
        .lte("start_date", queryEndDate)
        .gte("end_date", queryStartDate),
    ])
      .then(([sessionsRes, remindersRes]) => {
        if (cancelled) return;
        if (sessionsRes.error || remindersRes.error) {
          console.error("Erro ao carregar agenda:", sessionsRes.error, remindersRes.error);
          setLoadError(true);
        }
        setSessions((sessionsRes.data as any) ?? []);
        setReminders((remindersRes.data as any) ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erro ao carregar agenda:", err);
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode, anchorDate, rangeStart, numDaysShown]);

  // Contadores de "hoje / esta semana / este mês" — sempre relativos à data
  // real de hoje, independente de pra onde o treinador navegou na agenda.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);
    const monthStart = startOfMonth(now);
    const monthEnd = addMonths(monthStart, 1);

    const countInRange = (start: Date, end: Date) =>
      supabase
        .from("training_sessions")
        .select("id", { count: "exact", head: true })
        .neq("status", "canceled")
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString());

    Promise.all([
      countInRange(dayStart, dayEnd),
      countInRange(weekStart, weekEnd),
      countInRange(monthStart, monthEnd),
    ]).then(([dayRes, weekRes, monthRes]) => {
      if (cancelled) return;
      setCounts({
        today: dayRes.count ?? 0,
        week: weekRes.count ?? 0,
        month: monthRes.count ?? 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [countsRefreshKey]);

  // Aniversários dos alunos ativos — independem do período visível (o
  // aniversário se repete todo ano), então busca uma vez só.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("students")
      .select("id, birth_date, profiles:profile_id (name)")
      .eq("status", "active")
      .not("birth_date", "is", null)
      .then(({ data }) => {
        if (cancelled) return;
        const list = ((data as any[]) ?? []).map((s) => ({
          id: s.id,
          name: s.profiles?.name ?? "Aluno",
          birth_date: s.birth_date as string,
        }));
        setBirthdayStudents(list);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(
    () => (numDaysShown > 0 ? Array.from({ length: numDaysShown }, (_, i) => addDays(rangeStart, i)) : []),
    [rangeStart, numDaysShown]
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const isGridView = viewMode === "day" || viewMode === "3day" || viewMode === "week";
  const nowMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const nowInGrid = nowMin >= 0 && nowMin <= (END_HOUR - START_HOUR) * 60;

  // Abrir a agenda (ou voltar pra "Hoje") já rolando até a hora atual, em
  // vez de sempre começar lá nas 5h — igual o Google. Só quando o "hoje"
  // está entre os dias visíveis; navegar pra outra semana não rola nada.
  useEffect(() => {
    if (!isGridView || !nowInGrid) return;
    if (!days.some((d) => sameDay(d, new Date()))) return;
    const line = nowLineRef.current;
    if (!line) return;
    const top = line.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3;
    window.scrollTo({ top: Math.max(0, top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, anchorDate]);

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

  function reminderForDay(key: string) {
    return reminders.find((r) => r.start_date <= key && key <= r.end_date) ?? null;
  }

  function birthdaysForDay(key: string) {
    const monthDay = key.slice(5); // "MM-DD" — compara ignorando o ano
    return birthdayStudents.filter((s) => s.birth_date.slice(5) === monthDay);
  }

  function minutesSinceStart(iso: string) {
    const d = new Date(iso);
    return (d.getHours() - START_HOUR) * 60 + d.getMinutes();
  }

  function durationOf(session: SessionRow) {
    return (new Date(session.end_at).getTime() - new Date(session.start_at).getTime()) / 60_000;
  }

  // Quando dois ou mais eventos do dia se sobrepõem no horário, divide a
  // coluna entre eles lado a lado (em vez de um cobrir o outro) — mesma
  // ideia usada no Google Agenda etc. Agrupa por "cluster" de horários
  // encadeados e, dentro de cada cluster, dá a cada evento a primeira
  // coluna livre (sem sobrepor quem já está lá).
  function layoutOverlaps(daySessions: SessionRow[]): Map<string, { col: number; cols: number }> {
    const sorted = [...daySessions].sort((a, b) => {
      const startDiff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      if (startDiff !== 0) return startDiff;
      return durationOf(b) - durationOf(a);
    });

    const result = new Map<string, { col: number; cols: number }>();
    let cluster: SessionRow[] = [];
    let clusterEnd = -Infinity;

    function flushCluster() {
      if (cluster.length === 0) return;
      const columnsEnd: number[] = []; // horário (timestamp) em que cada coluna fica livre de novo
      const placements: { session: SessionRow; col: number }[] = [];
      for (const s of cluster) {
        const start = new Date(s.start_at).getTime();
        let col = columnsEnd.findIndex((end) => end <= start);
        if (col === -1) {
          col = columnsEnd.length;
          columnsEnd.push(0);
        }
        columnsEnd[col] = new Date(s.end_at).getTime();
        placements.push({ session: s, col });
      }
      const totalCols = columnsEnd.length;
      for (const p of placements) {
        result.set(p.session.id, { col: p.col, cols: totalCols });
      }
      cluster = [];
    }

    for (const s of sorted) {
      const start = new Date(s.start_at).getTime();
      if (cluster.length > 0 && start >= clusterEnd) {
        flushCluster();
        clusterEnd = -Infinity;
      }
      cluster.push(s);
      clusterEnd = Math.max(clusterEnd, new Date(s.end_at).getTime());
    }
    flushCluster();

    return result;
  }

  function cancelPendingHold() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingHoldRef.current = null;
  }

  function handlePointerDown(e: React.PointerEvent, session: SessionRow, dayIndex: number) {
    if (e.button !== 0) return; // só botão esquerdo / toque
    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;

    pendingHoldRef.current = { sessionId: session.id, dayIndex, pointerId, startX, startY };

    // só "pega" a aula (e passa a responder ao arraste) depois de segurar
    // paradinho por um tempinho — um toque rápido continua sendo só clique
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      pendingHoldRef.current = null;
      try {
        target.setPointerCapture(pointerId);
      } catch {
        return; // já soltou o dedo antes do tempo de segurar completar
      }
      const colWidth =
        dayColRefs.current[dayIndex]?.getBoundingClientRect().width || DAY_COL_FALLBACK_WIDTH;
      setDrag({
        sessionId: session.id,
        durationMin: durationOf(session),
        originDayIndex: dayIndex,
        originStartMin: minutesSinceStart(session.start_at),
        pointerStartX: startX,
        pointerStartY: startY,
        currentDayIndex: dayIndex,
        currentStartMin: minutesSinceStart(session.start_at),
        moved: false,
        colWidth,
      });
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    // ainda esperando confirmar o "segurar" — se mexer demais antes da
    // hora, cancela (não vira arraste, e o clique normal continua valendo)
    const pending = pendingHoldRef.current;
    if (pending) {
      const deltaX = e.clientX - pending.startX;
      const deltaY = e.clientY - pending.startY;
      if (Math.abs(deltaX) > DRAG_THRESHOLD_PX || Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
        cancelPendingHold();
      }
      return;
    }

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
    cancelPendingHold();
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
      setCountsRefreshKey((k) => k + 1); // a aula pode ter entrado/saído de hoje, da semana ou do mês
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

  // clique num horário vazio da grade já abre "nova aula" com a data e o
  // horário preenchidos — só dispara clicando no fundo (não numa aula já
  // marcada, que tem seu próprio card por cima)
  function handleSlotClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (justSwipedRef.current) {
      justSwipedRef.current = false;
      return;
    }
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesFromStart = Math.round(offsetY / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
    const totalMinutes = clamp(START_HOUR * 60 + minutesFromStart, START_HOUR * 60, END_HOUR * 60);
    router.push(`/agenda/nova?date=${dateKey(day)}&time=${formatHM(totalMinutes)}`);
  }

  // Arrastar/deslizar pros lados no fundo da agenda troca de período (dia,
  // 3 dias, semana ou mês, dependendo da visão) — igual o gesto de "swipe"
  // dos apps de calendário no celular. Ignora se o gesto começou em cima de
  // uma aula (que já tem seu próprio arraste pra reagendar) ou se for mais
  // vertical que horizontal (rolagem normal da página).
  function handleSwipeStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-session-block]")) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleSwipeEnd(e: React.PointerEvent) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      justSwipedRef.current = true;
      if (deltaX < 0) goNext();
      else goPrev();
    }
  }

  function handleSwipeCancel() {
    swipeStartRef.current = null;
  }

  function goPrev() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "3day") setAnchorDate((d) => addDays(d, -3));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, -7));
    else if (viewMode === "list") setAnchorDate((d) => addDays(d, -LIST_DAYS));
    else setAnchorDate((d) => addMonths(d, -1));
  }

  function goNext() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "3day") setAnchorDate((d) => addDays(d, 3));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, 7));
    else if (viewMode === "list") setAnchorDate((d) => addDays(d, LIST_DAYS));
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

  // Em todas as visões (dia/3 dias/semana) as colunas dividem 100% da
  // largura disponível — sem forçar uma largura mínima que causaria
  // rolagem horizontal em telas estreitas (era o que acontecia antes com
  // dia/3 dias no celular: só ~2 colunas cabiam, tendo que arrastar pra
  // ver o resto).
  const gridMinWidth = undefined;

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

        {/* criar aula/lembrete agora vive no botão + flutuante (canto
            inferior direito, estilo Google) — ver o FAB no fim do componente */}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-lightblue/15 px-3 py-1 font-medium text-blue">
          Hoje <strong className="text-navy">{counts.today}</strong>
        </span>
        <span className="rounded-full bg-lightblue/15 px-3 py-1 font-medium text-blue">
          Esta semana <strong className="text-navy">{counts.week}</strong>
        </span>
        <span className="rounded-full bg-lightblue/15 px-3 py-1 font-medium text-blue">
          Este mês <strong className="text-navy">{counts.month}</strong>
        </span>
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

      {isGridView && (
        <p className="mb-2 text-xs text-blue">
          Segure e arraste uma aula pra mudar o dia ou o horário. Laranja = feriado, azul =
          lembrete, 🎂 = aniversário.
        </p>
      )}

      {viewMode === "month" ? (
        <div
          className="touch-pan-y rounded-xl border border-lightblue/30 bg-white p-3"
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={handleSwipeCancel}
        >
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
              const reminder = reminderForDay(dateKey(day));
              const birthdays = birthdaysForDay(dateKey(day));
              const daySessions = sessionsByDay.get(dateKey(day)) ?? [];

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (justSwipedRef.current) {
                      justSwipedRef.current = false;
                      return;
                    }
                    openDay(day);
                  }}
                  title={
                    [
                      holidayName,
                      reminder?.title,
                      birthdays.length ? `🎂 ${birthdays.map((b) => b.name).join(", ")}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  className="flex min-h-[76px] flex-col items-stretch gap-0.5 rounded-lg p-1 text-left hover:bg-lightblue/10 sm:min-h-[96px]"
                >
                  {/* dia com bolinha no "hoje", igual o Google */}
                  <span
                    className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? "bg-orange text-white" : "text-navy"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {/* barrinhas com nome (não bolinhas): dia inteiro primeiro
                      (feriado/lembrete/🎂), depois as aulas — máx. 3 no
                      total, o resto vira "+N" */}
                  {(() => {
                    type Bar = { key: string; text: string; style?: React.CSSProperties; cls: string };
                    const bars: Bar[] = [];
                    if (holidayName)
                      bars.push({ key: "h", text: holidayName, cls: "bg-peach/60 text-navy" });
                    if (reminder)
                      bars.push({ key: "r", text: reminder.title, cls: "bg-blue text-white" });
                    if (birthdays.length)
                      bars.push({
                        key: "b",
                        text: `🎂 ${birthdays.map((b) => b.name).join(", ")}`,
                        cls: "bg-peach/35 text-navy",
                      });
                    for (const s of daySessions) {
                      const nome = s.students?.profiles?.name ?? (s.title || "Compromisso");
                      if (s.status === "canceled") {
                        bars.push({ key: s.id, text: nome, cls: "bg-lightblue/20 text-blue line-through" });
                      } else if (s.status === "done") {
                        bars.push({ key: s.id, text: `✓ ${nome}`, cls: "bg-blue text-white" });
                      } else {
                        const hex = s.color || DEFAULT_EVENT_HEX;
                        bars.push({
                          key: s.id,
                          text: nome,
                          cls: "",
                          style: { backgroundColor: hex, color: eventTextColor(hex) },
                        });
                      }
                    }
                    const shown = bars.slice(0, 3);
                    const extra = bars.length - shown.length;
                    return (
                      <>
                        {shown.map((b) => (
                          <span
                            key={b.key}
                            className={`block w-full truncate rounded px-1 text-[9px] font-medium leading-[15px] ${b.cls}`}
                            style={b.style}
                          >
                            {b.text}
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="block px-1 text-[9px] font-medium leading-[13px] text-blue">
                            +{extra}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* Programação: a lista corrida do Google — só os dias com algo
           marcado nos próximos 30 dias, um embaixo do outro */
        <div
          className="touch-pan-y rounded-xl border border-lightblue/30 bg-white"
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={handleSwipeCancel}
        >
          {(() => {
            const rows = days
              .map((day) => {
                const key = dateKey(day);
                return {
                  day,
                  isToday: sameDay(day, today),
                  holidayName: getHolidayName(key),
                  reminder: reminderForDay(key),
                  birthdays: birthdaysForDay(key),
                  daySessions: [...(sessionsByDay.get(key) ?? [])].sort(
                    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
                  ),
                };
              })
              .filter(
                (r) => r.daySessions.length > 0 || r.holidayName || r.reminder || r.birthdays.length > 0
              );

            if (!loading && rows.length === 0) {
              return (
                <p className="p-6 text-center text-sm text-blue">
                  Nada marcado nos próximos {LIST_DAYS} dias. Toque no + pra criar uma aula.
                </p>
              );
            }

            return rows.map((r) => (
              <div key={dateKey(r.day)} className="flex gap-3 border-b border-lightblue/15 p-3 last:border-b-0">
                {/* data à esquerda, com a bolinha do "hoje" */}
                <button
                  type="button"
                  onClick={() => openDay(r.day)}
                  className="w-11 flex-none text-center"
                >
                  <p className="text-[10px] font-medium uppercase text-blue">
                    {WEEKDAY_LABELS[r.day.getDay()]}
                  </p>
                  <p
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      r.isToday ? "bg-orange text-white" : "text-navy"
                    }`}
                  >
                    {r.day.getDate()}
                  </p>
                </button>

                <div className="min-w-0 flex-1 space-y-1.5">
                  {r.holidayName && (
                    <p className="truncate rounded-lg bg-peach/50 px-3 py-1.5 text-xs font-medium text-navy">
                      {r.holidayName}
                    </p>
                  )}
                  {r.reminder && (
                    <a
                      href={`/agenda/lembretes/${r.reminder.id}/editar`}
                      className="block truncate rounded-lg bg-blue px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
                    >
                      {r.reminder.title}
                    </a>
                  )}
                  {r.birthdays.map((b) => (
                    <a
                      key={b.id}
                      href={`/alunos/${b.id}`}
                      className="block truncate rounded-lg bg-peach/30 px-3 py-1.5 text-xs font-medium text-navy hover:bg-peach/40"
                    >
                      🎂 Aniversário: {b.name}
                    </a>
                  ))}
                  {r.daySessions.map((s) => {
                    const nome = s.students?.profiles?.name ?? (s.title || "Compromisso");
                    const horario = `${formatTimeInBrazil(s.start_at)} – ${formatTimeInBrazil(s.end_at)}`;
                    if (s.status === "canceled") {
                      return (
                        <a
                          key={s.id}
                          href={`/agenda/${s.id}/editar`}
                          className="flex items-baseline justify-between gap-2 rounded-lg bg-lightblue/15 px-3 py-1.5 text-sm text-blue line-through"
                        >
                          <span className="truncate font-medium">
                            {nome}
                            {s.students && s.title ? ` · ${s.title}` : ""}
                          </span>
                          <span className="flex-none text-xs">{horario}</span>
                        </a>
                      );
                    }
                    const done = s.status === "done";
                    const hex = done ? "#2F4599" : s.color || DEFAULT_EVENT_HEX;
                    return (
                      <a
                        key={s.id}
                        href={`/agenda/${s.id}/editar`}
                        className="flex items-baseline justify-between gap-2 rounded-lg px-3 py-1.5 text-sm hover:brightness-110"
                        style={{ backgroundColor: hex, color: eventTextColor(hex) }}
                      >
                        <span className="truncate font-semibold">
                          {done ? "✓ " : ""}
                          {nome}
                          {s.students && s.title ? ` · ${s.title}` : ""}
                        </span>
                        <span className="flex-none text-xs opacity-90">{horario}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      ) : (
        <div
          className="touch-pan-y overflow-x-auto rounded-xl border border-lightblue/30 bg-white"
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={handleSwipeCancel}
        >
          <div className="flex" style={gridMinWidth ? { minWidth: `${gridMinWidth}px` } : undefined}>
            {/* coluna de horas */}
            <div className="sticky left-0 z-10 w-14 flex-none bg-white">
              <div className="h-16 border-b border-lightblue/20" />
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
              const dayLayouts = layoutOverlaps(daySessions);
              const holidayName = getHolidayName(dateKey(day));
              const reminder = reminderForDay(dateKey(day));
              const birthdays = birthdaysForDay(dateKey(day));
              const bannerText = [
                holidayName,
                reminder?.title,
                birthdays.length ? `🎂 ${birthdays.map((b) => b.name).join(", ")}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const hasBanner = Boolean(holidayName || reminder || birthdays.length);
              const bannerColorClass = holidayName
                ? "text-orange"
                : reminder
                  ? "text-blue"
                  : "text-navy";

              return (
                <div
                  key={dayIndex}
                  ref={(el) => {
                    dayColRefs.current[dayIndex] = el;
                  }}
                  className="flex-1 border-l border-lightblue/10"
                >
                  <div
                    title={bannerText || undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-0.5 border-b px-0.5 ${
                      isToday
                        ? "border-lightblue/20 bg-orange/10"
                        : holidayName
                          ? "border-orange/30 bg-peach/60"
                          : reminder
                            ? "border-blue/30 bg-blue/15"
                            : birthdays.length
                              ? "border-peach bg-peach/30"
                              : "border-lightblue/20"
                    }`}
                  >
                    <p className="text-[11px] font-medium text-blue">
                      {WEEKDAY_LABELS[day.getDay()]}
                    </p>
                    <p className={`text-sm font-bold ${isToday ? "text-orange" : "text-navy"}`}>
                      {day.getDate()}
                    </p>
                    {hasBanner &&
                      (reminder ? (
                        <a
                          href={`/agenda/lembretes/${reminder.id}/editar`}
                          className={`w-full truncate text-center text-[8px] font-semibold leading-tight hover:underline ${bannerColorClass}`}
                        >
                          {bannerText}
                        </a>
                      ) : birthdays.length === 1 ? (
                        <a
                          href={`/alunos/${birthdays[0].id}`}
                          className={`w-full truncate text-center text-[8px] font-semibold leading-tight hover:underline ${bannerColorClass}`}
                        >
                          {bannerText}
                        </a>
                      ) : (
                        <p
                          className={`w-full truncate text-center text-[8px] font-semibold leading-tight ${bannerColorClass}`}
                        >
                          {bannerText}
                        </p>
                      ))}
                  </div>

                  <div
                    className="relative cursor-pointer"
                    onClick={(e) => handleSlotClick(e, day)}
                    style={{
                      height: `${(END_HOUR - START_HOUR) * 60 * PX_PER_MIN}px`,
                      backgroundColor: holidayName
                        ? "rgba(243,168,136,0.18)"
                        : reminder
                          ? "rgba(47,69,153,0.06)"
                          : birthdays.length
                            ? "rgba(243,168,136,0.10)"
                            : undefined,
                    }}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute w-full border-b border-lightblue/10"
                        style={{ top: `${(h - START_HOUR) * 60 * PX_PER_MIN}px` }}
                      />
                    ))}

                    {/* tracinho vermelho do "agora", igual o Google — só na
                        coluna de hoje, com a bolinha na borda esquerda */}
                    {isToday && nowInGrid && (
                      <div
                        ref={nowLineRef}
                        aria-hidden
                        className="pointer-events-none absolute left-0 right-0 z-10"
                        style={{ top: `${nowMin * PX_PER_MIN}px` }}
                      >
                        <div className="h-[2px] w-full bg-[#EA4335]" />
                        <div className="absolute -left-[5px] -top-[4px] h-[10px] w-[10px] rounded-full bg-[#EA4335]" />
                      </div>
                    )}

                    {daySessions.map((s) => {
                      const isDraggingThis = drag?.sessionId === s.id;
                      const startMin = isDraggingThis ? drag!.currentStartMin : minutesSinceStart(s.start_at);
                      const durationMin = Math.max(20, durationOf(s));
                      const dayOffsetPx = isDraggingThis
                        ? (drag!.currentDayIndex - drag!.originDayIndex) * drag!.colWidth
                        : 0;
                      // enquanto arrasta, ocupa a coluna inteira (mais fácil de
                      // ver/soltar); parado, divide com quem mais se sobrepõe
                      const layout = isDraggingThis
                        ? { col: 0, cols: 1 }
                        : (dayLayouts.get(s.id) ?? { col: 0, cols: 1 });
                      const widthPct = 100 / layout.cols;
                      const leftPct = layout.col * widthPct;

                      return (
                        <a
                          key={s.id}
                          href={`/agenda/${s.id}/editar`}
                          data-session-block="true"
                          onClick={(e) => handleBlockClick(e, s.id, drag?.moved ?? false)}
                          onContextMenu={(e) => e.preventDefault()}
                          onPointerDown={(e) => handlePointerDown(e, s, dayIndex)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={() => {
                            cancelPendingHold();
                            setDrag(null);
                          }}
                          className={`absolute touch-none overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight select-none [-webkit-touch-callout:none] ${
                            s.status === "canceled" ? "bg-lightblue/15 text-blue line-through" : ""
                          } ${isDraggingThis ? "cursor-grabbing" : "cursor-grab"}`}
                          style={{
                            top: `${startMin * PX_PER_MIN}px`,
                            height: `${durationMin * PX_PER_MIN}px`,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            transform: dayOffsetPx ? `translateX(${dayOffsetPx}px)` : undefined,
                            opacity: isDraggingThis ? 0.85 : 1,
                            boxShadow: isDraggingThis ? "0 6px 16px rgba(31,37,86,0.35)" : undefined,
                            zIndex: isDraggingThis ? 20 : undefined,
                            // bloco de cor cheia, estilo Google: agendada usa a
                            // cor do evento (ou o laranja padrão), concluída
                            // fica azul; só a cancelada continua apagada
                            ...(s.status !== "canceled"
                              ? (() => {
                                  const hex =
                                    s.status === "done" ? "#2F4599" : s.color || DEFAULT_EVENT_HEX;
                                  return { backgroundColor: hex, color: eventTextColor(hex) };
                                })()
                              : undefined),
                          }}
                        >
                          {/* arrastando, o horário sobe pra 1ª linha (em bloco
                              curto só ela aparece — e é o feedback do arraste) */}
                          <p className="truncate font-semibold">
                            {isDraggingThis
                              ? formatHM(START_HOUR * 60 + drag!.currentStartMin)
                              : `${s.status === "done" ? "✓ " : ""}${s.students?.profiles?.name ?? (s.title || "Compromisso")}${s.students && s.title ? ` · ${s.title}` : ""}`}
                          </p>
                          <p className="truncate opacity-90">
                            {isDraggingThis
                              ? `${s.students?.profiles?.name ?? (s.title || "Compromisso")}`
                              : formatTimeInBrazil(s.start_at)}
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
      {!loading && loadError && (
        <p className="mt-2 text-xs text-orange">
          Não foi possível carregar a agenda agora.{" "}
          <button
            type="button"
            onClick={() => setAnchorDate((d) => new Date(d))}
            className="font-medium underline"
          >
            Tentar de novo
          </button>
        </p>
      )}
      {!loading && !loadError && isGridView && sessions.length === 0 && (
        <p className="mt-2 text-xs text-blue">Nenhuma aula marcada nesse período.</p>
      )}

      {/* Botão + flutuante, estilo Google: toca, abre as duas opções */}
      {fabOpen && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setFabOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-navy/10"
        />
      )}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
        {fabOpen && (
          <>
            <a
              href="/agenda/lembretes/novo"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-navy shadow-[0_6px_20px_-6px_rgba(31,37,86,0.45)] hover:bg-lightblue/10"
            >
              <Bell size={16} className="text-blue" />
              Lembrete
            </a>
            <a
              href="/agenda/nova?compromisso=1"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-navy shadow-[0_6px_20px_-6px_rgba(31,37,86,0.45)] hover:bg-lightblue/10"
            >
              <CalendarClock size={16} className="text-navy" />
              Compromisso
            </a>
            <a
              href="/agenda/nova"
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-navy shadow-[0_6px_20px_-6px_rgba(31,37,86,0.45)] hover:bg-lightblue/10"
            >
              <Plus size={16} className="text-orange" />
              Aula
            </a>
          </>
        )}
        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? "Fechar opções de criar" : "Criar aula, compromisso ou lembrete"}
          aria-expanded={fabOpen}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange text-white shadow-[0_8px_24px_-6px_rgba(237,91,53,0.6)] transition-transform hover:bg-orange2 active:scale-95"
        >
          <Plus size={26} className={`transition-transform ${fabOpen ? "rotate-45" : ""}`} />
        </button>
      </div>
    </div>
  );
}
