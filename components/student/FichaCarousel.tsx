"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PartyPopper, Share2 } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import ExerciseCard from "@/components/ExerciseCard";
import { groupExercisesByMethod } from "@/lib/workoutMethods";

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
};

export type Session = {
  workoutId: string;
  workoutName: string;
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
  trainer_feedback_text: string | null;
  trainer_rating: number | null;
};

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
              Ficha {s.label}
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
        {sessions.map((s, i) => {
          const exercisesToday = s.exercises;
          const completedCount = exercisesToday.filter(
            (we) => logByExercise[we.id]?.completed
          ).length;
          const totalCount = exercisesToday.length;
          const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return (
            <div
              key={`${s.workoutId}:${s.label}`}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className="w-full flex-none snap-center pr-0"
            >
              <div className="pr-1">
                <StudentCard className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-heading font-semibold text-navy">{s.workoutName}</p>
                      <p className="text-sm text-blue">
                        {completedCount} de {totalCount} concluídos
                      </p>
                    </div>
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-navy to-blue font-heading text-base font-bold text-white shadow-[0_4px_14px_-2px_rgba(31,37,86,0.5)]">
                      {s.label}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-lightblue/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange to-orange2 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {completedCount > 0 && (
                    <Link
                      href={`/treino-do-dia/concluido?w=${s.workoutId}&l=${s.label}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-navy to-blue px-4 py-3 text-sm font-medium text-white shadow-[0_4px_14px_-2px_rgba(31,37,86,0.5)]"
                    >
                      {completedCount === totalCount ? (
                        <>
                          <PartyPopper size={16} />
                          Ver resumo e compartilhar
                        </>
                      ) : (
                        <>
                          <Share2 size={16} />
                          Compartilhar progresso
                        </>
                      )}
                    </Link>
                  )}
                </StudentCard>

                <div className="space-y-3">
                  {groupExercisesByMethod(exercisesToday).map((group, gi) => {
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
                          initialActualLoad={log?.actual_load ?? null}
                          trainerFeedbackText={log?.trainer_feedback_text ?? null}
                          trainerRating={log?.trainer_rating ?? null}
                        />
                      );
                    });

                    if (group.items.length > 1) {
                      return (
                        <div
                          key={gi}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
