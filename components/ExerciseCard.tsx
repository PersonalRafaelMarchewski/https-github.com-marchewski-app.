"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
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
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="font-heading font-semibold text-navy">{exerciseName}</p>
          {muscleGroup && <p className="text-sm text-blue">{muscleGroup}</p>}
        </div>
        <div className="flex items-center gap-2">
          {completed && (
            <span className="flex items-center gap-1 rounded-full bg-peach/40 px-2 py-1 text-xs font-medium text-navy">
              <Check size={14} /> Concluído
            </span>
          )}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-blue">
            {sets ?? "-"}x{reps ?? "-"} · {load || "peso corporal"} · descanso {restSeconds ?? "-"}s
          </p>

          {instructions && <p className="text-sm text-navy">{instructions}</p>}

          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange hover:underline"
            >
              Ver vídeo do exercício
            </a>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Dificuldade (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`h-9 w-9 rounded-full text-sm font-semibold ${
                    rating === n ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Comentário</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              placeholder="Como foi o exercício?"
            />
          </div>

          <Button onClick={handleComplete} disabled={saving}>
            {saving ? "Salvando..." : "Marcar como concluído"}
          </Button>
        </div>
      )}
    </Card>
  );
}
