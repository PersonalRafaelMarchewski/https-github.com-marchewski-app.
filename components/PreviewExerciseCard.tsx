import { Repeat, Dumbbell, Timer } from "lucide-react";
import Card from "@/components/Card";
import ExerciseVideoButton from "@/components/ExerciseVideoButton";
import { isLinkingMethod } from "@/lib/workoutMethods";
import { isCardioGroup, formatSetsReps } from "@/lib/cardio";

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-lightblue/10 px-2.5 py-1.5 text-sm text-navy">
      <span className="text-blue">{icon}</span>
      {label}
    </div>
  );
}

export default function PreviewExerciseCard({
  exerciseName,
  muscleGroup,
  videoUrl,
  instructions,
  sets,
  reps,
  load,
  restSeconds,
  method,
}: {
  exerciseName: string;
  muscleGroup: string | null;
  videoUrl: string | null;
  instructions: string | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  restSeconds: number | null;
  method?: string | null;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <p className="truncate font-heading font-semibold text-navy">{exerciseName}</p>
        {method && !isLinkingMethod(method) && (
          <span className="flex-none rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold text-orange">
            {method}
          </span>
        )}
      </div>
      {muscleGroup && <p className="mb-3 text-sm text-blue">{muscleGroup}</p>}

      <div className="flex flex-wrap gap-2">
        <StatChip
          icon={isCardioGroup(muscleGroup) ? <Timer size={14} /> : <Repeat size={14} />}
          label={formatSetsReps(sets, reps, muscleGroup)}
        />
        {(!isCardioGroup(muscleGroup) || load) && (
          <StatChip icon={<Dumbbell size={14} />} label={load || "peso corporal"} />
        )}
        <StatChip icon={<Timer size={14} />} label={`${restSeconds ?? "-"}s descanso`} />
      </div>

      {instructions && <p className="mt-3 text-sm text-navy">{instructions}</p>}

      {videoUrl && <ExerciseVideoButton videoUrl={videoUrl} />}
    </Card>
  );
}
