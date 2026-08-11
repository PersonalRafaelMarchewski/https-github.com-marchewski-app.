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

export type AlternativeExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  instructions: string | null;
};

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
  // outras opções pra quando a máquina do exercício prescrito estiver
  // ocupada ou não existir na academia do aluno
  alternatives?: AlternativeExercise[];
  initialSubstitutedExercise?: AlternativeExercise | null;
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
  alternatives = [],
  initialSubstitutedExercise = null,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [completed, setCompleted] = useState(initialCompleted);
  // null = fazendo o exercício prescrito mesmo; senão, a alternativa
  // escolhida (ex: máquina ocupada) — troca o que é exibido e o que conta
  // pro histórico/recorde desse set
  const [activeExercise, setActiveExercise] = useState<AlternativeExercise | null>(
    initialSubstitutedExercise
  );
  // guardado à parte (não só a prop) porque depois do primeiro clique cria
  // um registro novo — sem isso, um segundo clique rápido (antes da tela
  // atualizar) criava OUTRO registro em vez de atualizar o mesmo
  const [logId, setLogId] = useState(existingLogId);
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayName = activeExercise?.name ?? exerciseName;
  const displayMuscleGroup = activeExercise ? activeExercise.muscle_group : muscleGroup;
  const displayVideoUrl = activeExercise ? activeExercise.video_url : videoUrl;
  const displayInstructions = activeExercise ? activeExercise.instructions : instructions;

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
    setSaveError(null);
    const supabase = createClient();

    const actualLoadsValues = actualLoads.map((v) => (v.trim() ? Number(v) : null));
    const numericLoads = actualLoadsValues.filter((v): v is number => v !== null);
    const actualLoadMax = numericLoads.length > 0 ? Math.max(...numericLoads) : null;

    const payload: Record<string, any> = nextCompleted
      ? {
          completed: true,
          difficulty_rating: rating,
          feedback_text: feedback,
          video_path: videoPath,
          actual_load: actualLoadMax,
          actual_loads: actualLoadsValues,
          substituted_exercise_id: activeExercise?.id ?? null,
        }
      : { completed: false };

    // Antes isso não conferia se o salvamento deu certo — a bolinha
    // preenchia na tela mesmo se o insert/update falhasse (sessão expirada,
    // rede instável), e o aluno achava que tinha salvo sem ter salvo de
    // verdade. Agora, se der erro, a tela avisa e NÃO marca como concluído.
    //
    // PGRST204 = a API do Supabase ainda não "viu" uma coluna que existe de
    // verdade no banco (cache de schema desatualizado depois de uma
    // migração) — já aconteceu de verdade com substituted_exercise_id. Se
    // acontecer de novo, tenta salvar sem esse campo em vez de travar tudo.
    let saveFailed = false;
    if (logId) {
      const { error } = await supabase.from("workout_logs").update(payload).eq("id", logId);
      if (error?.code === "PGRST204" && "substituted_exercise_id" in payload) {
        const { substituted_exercise_id, ...payloadWithoutSub } = payload as typeof payload & {
          substituted_exercise_id?: string | null;
        };
        const retry = await supabase.from("workout_logs").update(payloadWithoutSub).eq("id", logId);
        saveFailed = !!retry.error;
      } else if (error) {
        saveFailed = true;
      }
    } else {
      const insertPayload: Record<string, any> = {
        workout_exercise_id: workoutExerciseId,
        student_id: studentId,
        date,
        ...payload,
      };
      const { data, error } = await supabase
        .from("workout_logs")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error?.code === "PGRST204" && "substituted_exercise_id" in insertPayload) {
        const { substituted_exercise_id, ...retryPayload } = insertPayload as typeof insertPayload & {
          substituted_exercise_id?: string | null;
        };
        const retry = await supabase.from("workout_logs").insert(retryPayload).select("id").single();
        if (retry.error || !retry.data) {
          saveFailed = true;
        } else {
          setLogId(retry.data.id);
        }
      } else if (error || !data) {
        saveFailed = true;
      } else {
        setLogId(data.id);
      }
    }

    setSaving(false);

    if (saveFailed) {
      setSaveError(
        "Não foi possível salvar agora. Confere sua internet e tenta de novo — se persistir, feche e abra o app."
      );
      return;
    }

    setCompleted(nextCompleted);
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
            <p className="truncate font-heading font-semibold text-navy">{displayName}</p>
            {method && !isLinkingMethod(method) && (
              <span className="flex-none rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold text-orange">
                {method}
              </span>
            )}
          </div>
          {displayMuscleGroup && <p className="text-sm text-blue">{displayMuscleGroup}</p>}
        </div>

        {open ? (
          <ChevronUp size={18} className="shrink-0 text-blue" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-blue" />
        )}
      </button>
      </div>

      {saveError && (
        <p className="mt-2 rounded-lg bg-orange/10 px-3 py-2 text-sm text-orange">{saveError}</p>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-lightblue/20 pt-4">
          {alternatives.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy">
                Máquina ocupada ou não tem na sua academia?
              </label>
              <select
                value={activeExercise?.id ?? ""}
                onChange={(e) => {
                  const alt = alternatives.find((a) => a.id === e.target.value);
                  setActiveExercise(alt ?? null);
                }}
                className="w-full rounded-2xl border border-lightblue/40 px-4 py-2.5 outline-none focus:border-orange"
              >
                <option value="">{exerciseName} (prescrito)</option>
                {alternatives.map((alt) => (
                  <option key={alt.id} value={alt.id}>
                    Fazer no lugar: {alt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <StatChip
              icon={isCardioGroup(displayMuscleGroup) ? <Timer size={14} /> : <Repeat size={14} />}
              label={formatSetsReps(sets, reps, displayMuscleGroup)}
            />
            {(!isCardioGroup(displayMuscleGroup) || load) && (
              <StatChip icon={<Dumbbell size={14} />} label={load || "peso corporal"} />
            )}
            <StatChip icon={<Timer size={14} />} label={`${restSeconds ?? "-"}s descanso`} />
          </div>

          <RestTimer seconds={restSeconds} />

          {!isCardioGroup(displayMuscleGroup) && (
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

          {displayInstructions && <p className="text-sm text-navy">{displayInstructions}</p>}

          {displayVideoUrl && <InlineExerciseVideo videoUrl={displayVideoUrl} />}

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
