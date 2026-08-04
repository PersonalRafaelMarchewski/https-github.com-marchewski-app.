"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Repeat, Dumbbell, Timer, Play } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";

type Props = {
  workoutExerciseId: string;
  studentId: string;
  date: string;
  exerciseName: string;
  muscleGroup: string | null;
  videoUrl: string | null;
  instructions: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  restSeconds: number | null;
  existingLogId: string | null;
  initialCompleted: boolean;
  initialRating: number | null;
  initialFeedback: string | null;
};

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-lightblue/10 px-2.5 py-1.5 text-sm text-navy">
      <span className="text-blue">{icon}</span>
      {label}
    </div>
  );
}

export default function ExerciseCard({
  workoutExerciseId,
  studentId,
  date,
  exerciseName,
  muscleGroup,
  videoUrl,
  instructions,
  sets,
  reps,
  load,
  restSeconds,
  existingLogId,
  initialCompleted,
  initialRating,
  initialFeedback,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [rating, setRating] = useState(initialRating ?? 3);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    const supabase = createClient();

    if (existingLogId) {
      await supabase
        .from("workout_logs")
        .update({ completed: true, difficulty_rating: rating, feedback_text: feedback })
        .eq("id", existingLogId);
    } else {
      await supabase.from("workout_logs").insert({
        workout_exercise_id: workoutExerciseId,
        student_id: studentId,
        date,
        completed: true,
        difficulty_rating: rating,
        feedback_text: feedback,
      });
    }

    setCompleted(true);
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <Card
      className={`transition-colors ${completed ? "border-orange/30 bg-orange/5" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        {completed ? (
          <CheckCircle2 size={24} className="shrink-0 text-orange" />
        ) : (
          <Circle size={24} className="shrink-0 text-lightblue" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold text-navy">{exerciseName}</p>
          {muscleGroup && <p className="text-sm text-blue">{muscleGroup}</p>}
        </div>

        {open ? (
          <ChevronUp size={18} className="shrink-0 text-blue" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-blue" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-lightblue/20 pt-4">
          <div className="flex flex-wrap gap-2">
            <StatChip icon={<Repeat size={14} />} label={`${sets ?? "-"}x${reps ?? "-"}`} />
            <StatChip icon={<Dumbbell size={14} />} label={load || "peso corporal"} />
            <StatChip icon={<Timer size={14} />} label={`${restSeconds ?? "-"}s descanso`} />
          </div>

          {instructions && <p className="text-sm text-navy">{instructions}</p>}

          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 text-sm font-medium text-orange hover:underline"
            >
              <Play size={14} />
              Ver vídeo do exercício
            </a>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              Dificuldade
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                    rating === n ? "bg-orange text-white" : "bg-lightblue/20 text-navy hover:bg-lightblue/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Comentário</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              placeholder="Como foi o exercício?"
            />
          </div>

          <Button onClick={handleComplete} disabled={saving} className="w-full">
            {saving ? "Salvando..." : completed ? "Atualizar" : "Marcar como concluído"}
          </Button>
        </div>
      )}
    </Card>
  );
}
