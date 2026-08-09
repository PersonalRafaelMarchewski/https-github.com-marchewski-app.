"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import MuscleGroupSelect from "@/components/MuscleGroupSelect";
import ExerciseVideoUploadField from "@/components/ExerciseVideoUploadField";
import { createExercise } from "@/app/(trainer)/exercicios/actions";

export default function AddExerciseForm() {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [uploadKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // muda a cada envio só pra "remontar" o seletor de grupo muscular e
  // limpar o modo "outro (digitar)" junto com o resto do formulário
  const [formVersion, setFormVersion] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("muscle_group", muscleGroup);
    formData.set("video_url", videoUrl);
    formData.set("instructions", instructions);

    startTransition(async () => {
      try {
        await createExercise(formData);
        setName("");
        setMuscleGroup("");
        setVideoUrl("");
        setInstructions("");
        setFormVersion((v) => v + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-3 border-dashed">
        <h2 className="font-heading font-semibold text-navy">Novo exercício</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              key={formVersion}
              value={muscleGroup}
              onChange={setMuscleGroup}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </div>
        </div>

        <ExerciseVideoUploadField videoUrl={videoUrl} onChange={setVideoUrl} uploadKey={uploadKey} />

        <div>
          <label className="mb-1 block text-xs text-blue">Instruções</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>

        {error && <p className="text-xs text-orange">{error}</p>}

        <Button type="submit" disabled={pending} className="flex items-center gap-2">
          <Plus size={16} />
          {pending ? "Adicionando..." : "Adicionar exercício"}
        </Button>
      </Card>
    </form>
  );
}
