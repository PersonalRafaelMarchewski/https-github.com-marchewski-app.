"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Repeat,
  Dumbbell,
  Timer,
  Play,
  Video,
  FolderOpen,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getVideoUploadUrl } from "@/app/(student)/treino-do-dia/video-actions";
import Button from "@/components/Button";
import Card from "@/components/Card";
import RestTimer from "@/components/RestTimer";

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
  initialVideoPath: string | null;
  trainerFeedbackText?: string | null;
  trainerRating?: number | null;
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
  initialVideoPath,
  trainerFeedbackText,
  trainerRating,
}: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(!initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [rating, setRating] = useState(initialRating ?? 3);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [videoPath, setVideoPath] = useState(initialVideoPath);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleVideoSelected(file: File | null) {
    if (!file) return;
    setVideoError(null);
    setUploadingVideo(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const { path, token } = await getVideoUploadUrl(workoutExerciseId, ext);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("exercise-videos")
        .uploadToSignedUrl(path, token, file);

      if (error) throw error;
      setVideoPath(path);
    } catch {
      setVideoError("Não foi possível enviar o vídeo. Tenta de novo?");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    const supabase = createClient();

    if (existingLogId) {
      await supabase
        .from("workout_logs")
        .update({
          completed: true,
          difficulty_rating: rating,
          feedback_text: feedback,
          video_path: videoPath,
        })
        .eq("id", existingLogId);
    } else {
      await supabase.from("workout_logs").insert({
        workout_exercise_id: workoutExerciseId,
        student_id: studentId,
        date,
        completed: true,
        difficulty_rating: rating,
        feedback_text: feedback,
        video_path: videoPath,
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

          <RestTimer seconds={restSeconds} />

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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              Vídeo do set <span className="font-normal text-blue">(opcional)</span>
            </label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleVideoSelected(e.target.files?.[0] ?? null)}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoSelected(e.target.files?.[0] ?? null)}
            />
            {videoPath ? (
              <button
                type="button"
                onClick={() => setVideoPath(null)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue hover:underline"
              >
                <X size={15} />
                Vídeo anexado — remover
              </button>
            ) : (
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
                >
                  <Video size={15} />
                  {uploadingVideo ? "Enviando..." : "Gravar vídeo"}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
                >
                  <FolderOpen size={15} />
                  {uploadingVideo ? "Enviando..." : "Da galeria"}
                </button>
              </div>
            )}
            {videoError && <p className="mt-1 text-xs text-orange">{videoError}</p>}
          </div>

          {(trainerFeedbackText || trainerRating) && (
            <div className="rounded-lg bg-navy/5 p-3">
              <p className="mb-1 text-xs font-semibold text-navy">
                Feedback do personal{trainerRating ? ` · nota ${trainerRating}/5` : ""}
              </p>
              {trainerFeedbackText && <p className="text-sm text-navy">{trainerFeedbackText}</p>}
            </div>
          )}

          <Button onClick={handleComplete} disabled={saving || uploadingVideo} className="w-full">
            {saving ? "Salvando..." : completed ? "Atualizar" : "Marcar como concluído"}
          </Button>
        </div>
      )}
    </Card>
  );
}
