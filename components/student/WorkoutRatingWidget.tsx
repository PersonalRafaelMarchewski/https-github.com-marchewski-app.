"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import StudentCard from "@/components/student/StudentCard";
import { rateWorkoutSession } from "@/app/(student)/treino-do-dia/finish";

export default function WorkoutRatingWidget({
  workoutId,
  label,
  sessionDate,
}: {
  workoutId: string;
  label: string;
  sessionDate: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRate(n: number) {
    setRating(n);
    setError(null);
    startTransition(async () => {
      try {
        await rateWorkoutSession(workoutId, label, sessionDate, n);
        setSaved(true);
      } catch {
        setError("Não deu pra salvar a avaliação agora — sem problema, o treino já foi contado.");
      }
    });
  }

  if (saved) {
    return (
      <StudentCard className="text-center">
        <p className="text-sm text-blue">Valeu pela avaliação! 🙌</p>
      </StudentCard>
    );
  }

  const shown = hoverRating ?? rating ?? 0;

  return (
    <StudentCard>
      <p className="mb-3 text-center font-heading font-semibold text-navy">Como foi esse treino?</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => handleRate(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(null)}
            aria-label={`Nota ${n}`}
            className="p-1 disabled:opacity-50"
          >
            <Star
              size={28}
              className={n <= shown ? "fill-orange text-orange" : "text-lightblue/40"}
            />
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-center text-xs text-orange">{error}</p>}
    </StudentCard>
  );
}
