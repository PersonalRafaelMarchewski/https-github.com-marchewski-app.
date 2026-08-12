"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
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

function SessionPanel({
  s,
  logByExercise,
  studentId,
  today,
}: {
  s: Session;
  logByExercise: Record<string, LogInfo>;
  studentId: string;
  today: string;
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
}: {
  sessions: Session[];
  logByExercise: Record<string, LogInfo>;
  studentId: string;
  today: string;
  initialIndex: number;
}) {
  const [active, setActive] = useState(initialIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const didInit = useRef(false);

  // posiciona no painel certo ao montar (sem animação, é só o ponto de partida)
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const panel = panelRefs.current[initialIndex];
    if (panel && scrollRef.current) {
      scrollRef.current.scrollLeft = panel.offsetLeft;
    }
  }, [initialIndex]);

  function scrollToIndex(i: number) {
    const panel = panelRefs.current[i];
    const container = scrollRef.current;
    if (!panel || !container) return;
    container.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
    setActive(i);
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActive(Math.max(0, Math.min(sessions.length - 1, index)));
  }

  return (
    <div>
      {sessions.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {sessions.map((s, i) => (
            <button
              key={`${s.workoutId}:${s.label}`}
              type="button"
              onClick={() => scrollToIndex(i)}
              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active === i
                  ? "bg-gradient-to-r from-orange to-orange2 text-white shadow-[0_4px_14px_-2px_rgba(237,91,53,0.5)]"
                  : "bg-lightblue/10 text-navy"
              }`}
            >
              {s.workoutName}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {sessions.map((s, i) => (
          <div
            key={`${s.workoutId}:${s.label}`}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className="w-full flex-none snap-center pr-0"
          >
            <SessionPanel s={s} logByExercise={logByExercise} studentId={studentId} today={today} />
          </div>
        ))}
      </div>
    </div>
  );
}
