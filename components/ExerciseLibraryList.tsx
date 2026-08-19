"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import Card from "@/components/Card";
import ExerciseRow from "@/components/ExerciseRow";
import { JOINT_TYPE_OPTIONS } from "@/lib/jointType";

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  joint_type?: string | null;
  video_url: string | null;
  instructions: string | null;
  active?: boolean;
};

// Com dezenas de exercícios cadastrados, rolar a tela toda pra achar um
// específico é ruim — filtra por nome/grupo muscular na hora de digitar,
// e também por número de articulações (mono/bi/multiarticular).
export default function ExerciseLibraryList({
  exercises,
  alternativesByExercise,
}: {
  exercises: Exercise[];
  alternativesByExercise: Record<string, string[]>;
}) {
  const [query, setQuery] = useState("");
  const [jointFilter, setJointFilter] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = exercises.filter((ex) => {
    const matchesQuery =
      !normalizedQuery ||
      ex.name.toLowerCase().includes(normalizedQuery) ||
      (ex.muscle_group ?? "").toLowerCase().includes(normalizedQuery);
    const matchesJoint = !jointFilter || ex.joint_type === jointFilter;
    return matchesQuery && matchesJoint;
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou grupo muscular..."
          className="w-full rounded-lg border border-lightblue/50 py-2.5 pl-9 pr-9 outline-none focus:border-orange"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue hover:text-orange"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setJointFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            jointFilter === "" ? "bg-navy text-white" : "bg-lightblue/15 text-blue"
          }`}
        >
          Todos
        </button>
        {JOINT_TYPE_OPTIONS.map((j) => (
          <button
            key={j.value}
            type="button"
            onClick={() => setJointFilter(jointFilter === j.value ? "" : j.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              jointFilter === j.value ? "bg-navy text-white" : "bg-lightblue/15 text-blue"
            }`}
          >
            {j.label}
          </button>
        ))}
      </div>

      {(query || jointFilter) && (
        <p className="text-xs text-blue">
          {filtered.length === 0
            ? "Nenhum exercício encontrado."
            : `${filtered.length} exercício${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}.`}
        </p>
      )}

      {filtered.length === 0 && !query && !jointFilter ? (
        <Card className="text-blue">Nenhum exercício cadastrado ainda.</Card>
      ) : (
        filtered.map((ex) => (
          <ExerciseRow
            key={ex.id}
            id={ex.id}
            initialName={ex.name}
            initialMuscleGroup={ex.muscle_group}
            initialJointType={ex.joint_type ?? null}
            initialVideoUrl={ex.video_url}
            initialInstructions={ex.instructions}
            initialActive={ex.active ?? true}
            allExercises={exercises}
            initialAlternativeIds={alternativesByExercise[ex.id] ?? []}
          />
        ))
      )}
    </div>
  );
}
