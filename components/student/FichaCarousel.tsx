"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Sparkles, AlertTriangle, Check } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import StudentButton from "@/components/student/StudentButton";
import ExerciseCard from "@/components/ExerciseCard";
import { groupExercisesByMethod } from "@/lib/workoutMethods";
import { finishWorkoutSession } from "@/app/(student)/treino-do-dia/finish";

type AlternativeExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  instructions: string | null;
};

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  label: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  method: string | null;
  order_index: number | null;
  exercises: {
    name: string | null;
    muscle_group: string | null;
    video_url: string | null;
    instructions: string | null;
  } | null;
  // outras opções pra quando a máquina prescrita estiver ocupada ou não
  // existir na academia do aluno
  alternatives: AlternativeExercise[];
};

export type Session = {
  workoutId: string;
  workoutName: string;
  // label é só chave interna pra agrupar exercícios da mesma ficha — bloco
  // não existe pro aluno, quem identifica a ficha é o nome do treino.
  label: string;
  exercises: WorkoutExerciseRow[];
};

type LogInfo = {
  id: string;
  completed: boolean;
  difficulty_rating: number | null;
  feedback_text: string | null;
  video_path: string | null;
  actual_load: number | null;
  actual_loads: (number | null)[] | null;
  actual_reps: (number | null)[] | null;
  substituted_exercise: AlternativeExercise | null;
  trainer_feedback_text: string | null;
  trainer_rating: number | null;
};

// dias corridos entre duas datas YYYY-MM-DD (meio-dia evita virar o dia
// por causa de fuso horário) — mesmo cálculo que lib/atRisk.ts já usa
// pro "aluno sem treinar há X dias" no painel do personal.
function daysBetween(todayStr: string, dateStr: string): number {
  const t = new Date(`${todayStr}T12:00:00`);
  const d = new Date(`${dateStr}T12:00:00`);
  return Math.max(0, Math.floor((t.getTime() - d.getTime()) / 86_400_000));
}

const STALE_THRESHOLD_DAYS = 5;

function SessionPanel({
  s,
  logByExercise,
  studentId,
  today,
  showBlockLabel,
}: {
  s: Session;
  logByExercise: Record<string, LogInfo>;
  studentId: string;
  today: string;
  showBlockLabel: boolean;
}) {
  const router = useRouter();
  const exercisesToday = s.exercises;

  const initialCompletedIds = useMemo(
    () => new Set(exercisesToday.filter((we) => logByExercise[we.id]?.completed).map((we) => we.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [completedIds, setCompletedIds] = useState(initialCompletedIds);
  const [openId, setOpenId] = useState<string | null>(() => {
    const firstPending = exercisesToday.find((we) => !initialCompletedIds.has(we.id));
    return firstPending?.id ?? null;
  });
  const [finishing, setFinishing] = useState(false);

  const completedCount = completedIds.size;
  const totalCount = exercisesToday.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleExerciseCompleted(id: string) {
    const updated = new Set(completedIds);
    updated.add(id);
    setCompletedIds(updated);

    // abre automaticamente o próximo exercício pendente da ficha
    const idx = exercisesToday.findIndex((we) => we.id === id);
    const nextPending = exercisesToday.slice(idx + 1).find((we) => !updated.has(we.id));
    setOpenId(nextPending?.id ?? null);
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await finishWorkoutSession(s.workoutId, s.label);
    } catch {
      // notificação é um extra — não pode travar o aluno de ver o resumo
    }
    router.push(`/treino-do-dia/concluido?w=${s.workoutId}&l=${s.label}`);
  }

  return (
    <div className="pr-1">
      <StudentCard className="mb-6">
        <div className="mb-3">
          <p className="font-heading font-semibold text-navy">{s.workoutName}</p>
          {showBlockLabel && (
            <p className="text-xs font-semibold text-orange">Bloco {s.label}</p>
          )}
          <p className="text-sm text-blue">
            {completedCount} de {totalCount} concluídos
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-lightblue/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange to-orange2 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <StudentButton
          onClick={handleFinish}
          disabled={finishing}
          className="mt-4 flex w-full items-center justify-center gap-2"
        >
          <PartyPopper size={16} />
          {finishing ? "Concluindo..." : "Concluir treino"}
        </StudentButton>
      </StudentCard>

      <div className="space-y-3">
        {groupExercisesByMethod(exercisesToday).map((group) => {
          const cards = group.items.map((we: any) => {
            const log = logByExercise[we.id];
            return (
              <ExerciseCard
                key={we.id}
                workoutExerciseId={we.id}
                studentId={studentId}
                date={today}
                exerciseName={we.exercises?.name ?? "Exercício"}
                muscleGroup={we.exercises?.muscle_group ?? null}
                videoUrl={we.exercises?.video_url ?? null}
                instructions={we.exercises?.instructions ?? null}
                sets={we.sets}
                reps={we.reps}
                load={we.load}
                restSeconds={we.rest_seconds}
                method={we.method}
                existingLogId={log?.id ?? null}
                initialCompleted={log?.completed ?? false}
                initialRating={log?.difficulty_rating ?? null}
                initialFeedback={log?.feedback_text ?? null}
                initialVideoPath={log?.video_path ?? null}
                initialActualLoads={log?.actual_loads ?? null}
                initialActualReps={log?.actual_reps ?? null}
                alternatives={we.alternatives}
                initialSubstitutedExercise={log?.substituted_exercise ?? null}
                trainerFeedbackText={log?.trainer_feedback_text ?? null}
                trainerRating={log?.trainer_rating ?? null}
                open={openId === we.id}
                onOpenChange={(isOpen) => setOpenId(isOpen ? we.id : null)}
                onCompleted={() => handleExerciseCompleted(we.id)}
              />
            );
          });

          if (group.items.length > 1) {
            return (
              <div
                key={group.items[0].id}
                className="space-y-2 rounded-3xl border border-orange/40 bg-orange/5 p-2"
              >
                <span className="ml-1 inline-block rounded-full bg-orange/15 px-2.5 py-1 text-xs font-semibold text-orange">
                  {group.method} · sem descanso entre eles
                </span>
                {cards}
              </div>
            );
          }

          return cards;
        })}
      </div>
    </div>
  );
}

export default function FichaCarousel({
  sessions,
  logByExercise,
  studentId,
  today,
  initialIndex,
  lastDoneBySession = {},
}: {
  sessions: Session[];
  logByExercise: Record<string, LogInfo>;
  studentId: string;
  today: string;
  initialIndex: number;
  lastDoneBySession?: Record<string, string | null>;
}) {
  const [active, setActive] = useState(initialIndex);

  // estatísticas de cada ficha pro seletor: quanto já foi feito hoje,
  // há quantos dias não é feita, e qual delas "está devendo" mais —
  // essa última vira a sugestão de hoje (só faz sentido comparar quando
  // tem mais de uma ficha ativa).
  const sessionStats = useMemo(() => {
    return sessions.map((s) => {
      const key = `${s.workoutId}:${s.label}`;
      const total = s.exercises.length;
      const completed = s.exercises.filter((we) => logByExercise[we.id]?.completed).length;
      const doneToday = total > 0 && completed === total;
      const lastDone = lastDoneBySession[key] ?? null;
      const daysSince = lastDone ? daysBetween(today, lastDone) : null;
      const stale = daysSince !== null && daysSince >= STALE_THRESHOLD_DAYS;
      return { key, total, completed, doneToday, lastDone, daysSince, stale };
    });
  }, [sessions, logByExercise, lastDoneBySession, today]);

  const suggestedKey = useMemo(() => {
    if (sessions.length <= 1) return null;
    const candidates = sessionStats.filter((s) => !s.doneToday);
    if (candidates.length === 0) return null;
    // nunca feita (daysSince null) conta como "mais devendo" que qualquer
    // ficha com data — ordena por dias desde a última vez, decrescente
    const sorted = [...candidates].sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
    return sorted[0].key;
  }, [sessions, sessionStats]);

  // quando o mesmo treino tem mais de um bloco (ex: "Inferiores (A) e
  // Superiores completo (B)" vira 2 fichas — bloco A e bloco B), os dois
  // cards mostravam o nome INTEIRO do treino, idêntico nos dois, sem
  // nada que distinguisse um do outro (achado com print real: pareciam
  // duplicados). Detecta isso e mostra "Bloco A"/"Bloco B" só nesses
  // casos — quando cada ficha já tem nome próprio (ex: Treino A/B/C/D),
  // não precisa de nada a mais.
  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.workoutName] = (counts[s.workoutName] ?? 0) + 1;
    return counts;
  }, [sessions]);

  // troca de ficha só acontece tocando nos cards do seletor — não é mais
  // um scroll nativo por baixo, então não precisa de nenhum ajuste de
  // posição inicial (o painel certo já nasce na frente via transform).

  function scrollToIndex(i: number) {
    setActive(i);
  }

  return (
    <div>
      {sessions.length > 1 && (
        <div className="mb-5 flex gap-3 overflow-x-auto pb-2 pt-1" style={{ scrollbarWidth: "none" }}>
          {sessions.map((s, i) => {
            const key = `${s.workoutId}:${s.label}`;
            const stat = sessionStats[i];
            const isActive = active === i;
            const isSuggested = key === suggestedKey;
            const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => scrollToIndex(i)}
                className={`relative flex w-[136px] flex-none flex-col rounded-2xl p-3.5 text-left transition-all duration-300 ${
                  isActive
                    ? "scale-[1.03] bg-gradient-to-br from-navy via-navy to-blue text-white shadow-[0_10px_28px_-8px_rgba(31,37,86,0.55)]"
                    : "bg-white text-navy shadow-[0_2px_10px_-4px_rgba(31,37,86,0.15)] hover:shadow-[0_4px_16px_-4px_rgba(31,37,86,0.25)]"
                }`}
              >
                {isSuggested && (
                  <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-orange to-orange2 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    <Sparkles size={10} />
                    Hoje
                  </span>
                )}
                {stat.doneToday && (
                  <span
                    className={`absolute -top-2 right-3 flex h-5 w-5 items-center justify-center rounded-full ${
                      isActive ? "bg-white text-navy" : "bg-navy text-white"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}

                <p className="truncate pr-1 font-heading text-sm font-semibold">{s.workoutName}</p>
                {nameCounts[s.workoutName] > 1 && (
                  <p className={`truncate text-[11px] font-medium ${isActive ? "text-white/70" : "text-orange"}`}>
                    Bloco {s.label}
                  </p>
                )}

                <div
                  className={`mt-2.5 h-1.5 w-full overflow-hidden rounded-full ${
                    isActive ? "bg-white/20" : "bg-lightblue/15"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isActive ? "bg-white" : "bg-gradient-to-r from-orange to-orange2"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`mt-1.5 text-[11px] ${isActive ? "text-white/70" : "text-blue"}`}>
                  {stat.completed}/{stat.total} feitos
                </p>

                {stat.stale && (
                  <p
                    className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${
                      isActive ? "text-orange2" : "text-orange"
                    }`}
                  >
                    <AlertTriangle size={10} />
                    {stat.daysSince}d sem treinar
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* overflow-hidden (não overflow-x-auto): a ficha só troca tocando
          nos cards do seletor acima — antes esse painel também era
          arrastável com o dedo, e como ele ocupa a tela toda, qualquer
          gesto horizontal dentro de um exercício (ex: arrastando o dedo
          sem querer no meio de um set) trocava de ficha sem avisar. */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {sessions.map((s) => (
            <div key={`${s.workoutId}:${s.label}`} className="w-full flex-none">
              <SessionPanel
                s={s}
                logByExercise={logByExercise}
                studentId={studentId}
                today={today}
                showBlockLabel={nameCounts[s.workoutName] > 1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
