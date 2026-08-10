"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Circle,
  ChevronDown,
  ChevronUp,
  Repeat,
  Dumbbell,
  Timer,
  Video,
  FolderOpen,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getVideoUploadUrl } from "@/app/(student)/treino-do-dia/video-actions";
import StudentCard from "@/components/student/StudentCard";
import RestTimer from "@/components/RestTimer";
import InlineExerciseVideo from "@/components/InlineExerciseVideo";
import { isLinkingMethod } from "@/lib/workoutMethods";
import { isCardioGroup, formatSetsReps } from "@/lib/cardio";
import { compressVideoIfNeeded } from "@/lib/videoCompression";

const SUPABASE_LIMIT_BYTES = 50 * 1024 * 1024;

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
  method?: string | null;
  existingLogId: string | null;
  initialCompleted: boolean;
  initialRating: number | null;
  initialFeedback: string | null;
  initialVideoPath: string | null;
  initialActualLoads: (number | null)[] | null;
  trainerFeedbackText?: string | null;
  trainerRating?: number | null;
  // aberto/fechado agora é controlado por quem monta a lista (pra poder
  // fechar esse card e abrir o próximo automaticamente ao concluir)
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-lightblue/10 px-3 py-1.5 text-sm text-navy">
      <span className="text-orange">{icon}</span>
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
  method,
  existingLogId,
  initialCompleted,
  initialRating,
  initialFeedback,
  initialVideoPath,
  initialActualLoads,
  trainerFeedbackText,
  trainerRating,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [completed, setCompleted] = useState(initialCompleted);
  const [rating, setRating] = useState(initialRating ?? 3);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  // uma carga por série (ex: 20, 22, 23 numa progressão) em vez de um valor
  // só pra tudo — o número de campos acompanha as séries prescritas
  const [actualLoads, setActualLoads] = useState<string[]>(() => {
    const count = sets && sets > 0 ? sets : 1;
    return Array.from({ length: count }, (_, i) => {
      const v = initialActualLoads?.[i];
      return v != null ? String(v) : "";
    });
  });
  const [videoPath, setVideoPath] = useState(initialVideoPath);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [compressingVideo, setCompressingVideo] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleVideoSelected(file: File | null) {
    if (!file) return;
    setVideoError(null);

    let toUpload = file;
    if (file.size > SUPABASE_LIMIT_BYTES) {
      setCompressingVideo(true);
      setCompressProgress(0);
      try {
        toUpload = await compressVideoIfNeeded(file, setCompressProgress);
      } catch {
        setCompressingVideo(false);
        setVideoError(
          "Não foi possível compactar o vídeo automaticamente. Tenta um vídeo mais curto."
        );
        return;
      }
      setCompressingVideo(false);

      if (toUpload.size > SUPABASE_LIMIT_BYTES) {
        setVideoError("Mesmo compactado, o vídeo ainda passou de 50MB. Tenta um vídeo mais curto.");
        return;
      }
    }

    setUploadingVideo(true);
    try {
      const ext = toUpload.name.split(".").pop() || "mp4";
      const { path, token } = await getVideoUploadUrl(workoutExerciseId, ext);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("exercise-videos")
        .uploadToSignedUrl(path, token, toUpload);

      if (error) throw error;
      setVideoPath(path);
    } catch {
      setVideoError("Não foi possível enviar o vídeo. Tenta de novo?");
    } finally {
      setUploadingVideo(false);
    }
  }

  // clicar na bolinha alterna concluído/não — sem botão separado embaixo.
  // Marcando como concluído, salva tudo que já foi preenchido (carga por
  // série, dificuldade, comentário, vídeo); desmarcando, só volta o status
  // (não mexe no que já foi registrado).
  async function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    const nextCompleted = !completed;
    setSaving(true);
    const supabase = createClient();

    const actualLoadsValues = actualLoads.map((v) => (v.trim() ? Number(v) : null));
    const numericLoads = actualLoadsValues.filter((v): v is number => v !== null);
    const actualLoadMax = numericLoads.length > 0 ? Math.max(...numericLoads) : null;

    const payload = nextCompleted
      ? {
          completed: true,
          difficulty_rating: rating,
          feedback_text: feedback,
          video_path: videoPath,
          actual_load: actualLoadMax,
          actual_loads: actualLoadsValues,
        }
      : { completed: false };

    if (existingLogId) {
      await supabase.from("workout_logs").update(payload).eq("id", existingLogId);
    } else {
      await supabase.from("workout_logs").insert({
        workout_exercise_id: workoutExerciseId,
        student_id: studentId,
        date,
        ...payload,
      });
    }

    setCompleted(nextCompleted);
    setSaving(false);
    if (nextCompleted) {
      onOpenChange(false); // minimiza esse
      onCompleted?.(); // e avisa quem monta a lista pra abrir o próximo
    }
    router.refresh();
  }

  return (
    <StudentCard
      className={`transition-all ${completed ? "bg-gradient-to-br from-orange/5 to-peach/10" : ""}`}
      glow={completed}
    >
      <div className="flex w-full items-center gap-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={saving}
          aria-label={completed ? "Marcar como não concluído" : "Marcar como concluído"}
          className="shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <span className="block h-[26px] w-[26px] animate-spin rounded-full border-2 border-lightblue/40 border-t-orange" />
          ) : completed ? (
            <Circle size={26} className="fill-navy text-navy" />
          ) : (
            <Circle size={26} className="text-lightblue" />
          )}
        </button>

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-heading font-semibold text-navy">{exerciseName}</p>
            {method && !isLinkingMethod(method) && (
              <span className="flex-none rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold text-orange">
                {method}
              </span>
            )}
          </div>
          {muscleGroup && <p className="text-sm text-blue">{muscleGroup}</p>}
        </div>

        {open ? (
          <ChevronUp size={18} className="shrink-0 text-blue" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-blue" />
        )}
      </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-lightblue/20 pt-4">
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

          <RestTimer seconds={restSeconds} />

          {!isCardioGroup(muscleGroup) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy">
                Carga usada (kg){" "}
                {load && <span className="font-normal text-blue">· prescrita: {load}</span>}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {actualLoads.map((value, i) => (
                  <div key={i}>
                    <label className="mb-1 block text-xs text-blue">Série {i + 1}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={value}
                      onChange={(e) =>
                        setActualLoads((prev) =>
                          prev.map((v, idx) => (idx === i ? e.target.value : v))
                        )
                      }
                      placeholder="ex: 22.5"
                      className="w-full rounded-2xl border border-lightblue/40 px-4 py-2.5 outline-none focus:border-orange"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {instructions && <p className="text-sm text-navy">{instructions}</p>}

          {videoUrl && <InlineExerciseVideo videoUrl={videoUrl} />}

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
              className="w-full rounded-2xl border border-lightblue/40 px-4 py-2.5 outline-none focus:border-orange"
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
                  disabled={uploadingVideo || compressingVideo}
                  className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
                >
                  <Video size={15} />
                  {uploadingVideo ? "Enviando..." : "Gravar vídeo"}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingVideo || compressingVideo}
                  className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
                >
                  <FolderOpen size={15} />
                  {uploadingVideo ? "Enviando..." : "Da galeria"}
                </button>
              </div>
            )}
            {compressingVideo && (
              <p className="mt-1 text-xs text-blue">
                Vídeo maior que 50MB — compactando automaticamente ({Math.round(compressProgress * 100)}%)...
              </p>
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

          <p className="pt-1 text-center text-xs text-blue">
            {completed
              ? "Toque na bolinha lá em cima pra desmarcar."
              : "Toque na bolinha lá em cima pra concluir."}
          </p>
        </div>
      )}
    </StudentCard>
  );
}
