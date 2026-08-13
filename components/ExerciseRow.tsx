"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import MuscleGroupSelect from "@/components/MuscleGroupSelect";
import JointTypePicker from "@/components/JointTypePicker";
import ExerciseVideoUploadField from "@/components/ExerciseVideoUploadField";
import ExerciseAlternativesPicker from "@/components/ExerciseAlternativesPicker";
import { jointTypeLabel } from "@/lib/jointType";
import { updateExercise, deleteExercise } from "@/app/(trainer)/exercicios/actions";

type ExerciseOption = { id: string; name: string; muscle_group: string | null };

export default function ExerciseRow({
  id,
  initialName,
  initialMuscleGroup,
  initialJointType,
  initialVideoUrl,
  initialInstructions,
  allExercises,
  initialAlternativeIds,
}: {
  id: string;
  initialName: string;
  initialMuscleGroup: string | null;
  initialJointType?: string | null;
  initialVideoUrl: string | null;
  initialInstructions: string | null;
  allExercises: ExerciseOption[];
  initialAlternativeIds: string[];
}) {
  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState(initialMuscleGroup ?? "");
  const [jointType, setJointType] = useState(initialJointType ?? "");
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recolhido por padrão — com 170+ exercícios cadastrados, abrir o
  // formulário de edição inteiro de cada um de cara deixava a tela
  // gigante e difícil de escanear. Mesmo padrão "resumo → clica →
  // expande" que o ExerciseCard já usa do lado do aluno.
  const [open, setOpen] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("muscle_group", muscleGroup);
    formData.set("joint_type", jointType);
    formData.set("video_url", videoUrl);
    formData.set("instructions", instructions);

    startTransition(async () => {
      try {
        await updateExercise(id, formData);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  const jtLabel = jointTypeLabel(jointType);

  return (
    <Card className={open ? "space-y-3" : ""}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold text-navy">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {muscleGroup && (
              <span className="rounded-full bg-lightblue/15 px-2 py-0.5 text-[11px] font-medium text-blue">
                {muscleGroup}
              </span>
            )}
            {jtLabel && (
              <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-medium text-orange">
                {jtLabel}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp size={18} className="shrink-0 text-blue" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-blue" />
        )}
      </button>

      {open && (
        <>
          <div className="grid grid-cols-1 gap-3 border-t border-lightblue/20 pt-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-blue">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-blue">Grupo muscular</label>
              <MuscleGroupSelect
                value={muscleGroup}
                onChange={setMuscleGroup}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-blue">
              Articulações <span className="font-normal">(opcional)</span>
            </label>
            <JointTypePicker value={jointType} onChange={setJointType} />
          </div>

          <ExerciseVideoUploadField videoUrl={videoUrl} onChange={setVideoUrl} uploadKey={id} />

          <div>
            <label className="mb-1 block text-xs text-blue">Instruções</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </div>

          <ExerciseAlternativesPicker
            exerciseId={id}
            exercises={allExercises}
            initialAlternativeIds={initialAlternativeIds}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-blue disabled:opacity-50"
            >
              {pending ? "..." : saved ? "Salvo" : "Salvar"}
            </button>
            <DeleteButton
              action={deleteExercise.bind(null, id)}
              confirmMessage={`Excluir "${name}" da biblioteca?`}
            />
          </div>

          {error && <p className="text-xs text-orange">{error}</p>}
        </>
      )}
    </Card>
  );
}
