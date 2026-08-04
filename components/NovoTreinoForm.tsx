"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

type Student = { id: string; name: string };
type Exercise = { id: string; name: string; muscle_group: string | null };

type Row = {
  key: string;
  exercise_id: string;
  label: string;
  sets: string;
  reps: string;
  load: string;
  rest_seconds: string;
};

function emptyRow(label: string = "A"): Row {
  return {
    key: crypto.randomUUID(),
    exercise_id: "",
    label,
    sets: "3",
    reps: "10-12",
    load: "",
    rest_seconds: "60",
  };
}

export default function NovoTreinoForm({
  students,
  exercises: initialExercises,
}: {
  students: Student[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [name, setName] = useState("Treino");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleAddExercise() {
    if (!newExercise.name.trim()) return;
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("exercises")
      .insert({ name: newExercise.name, muscle_group: newExercise.muscle_group || null })
      .select()
      .single();

    if (insertError || !data) {
      setError("Não foi possível criar o exercício.");
      return;
    }

    setExercises((prev) => [...prev, data]);
    setNewExercise({ name: "", muscle_group: "" });
    setShowNewExercise(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Selecione um aluno.");
      return;
    }
    if (rows.some((r) => !r.exercise_id)) {
      setError("Escolha um exercício em todas as linhas.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({
        trainer_id: user!.id,
        student_id: studentId,
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        status: "active",
      })
      .select()
      .single();

    if (workoutError || !workout) {
      setError("Não foi possível criar o treino.");
      setSaving(false);
      return;
    }

    const payload = rows.map((r, index) => ({
      workout_id: workout.id,
      exercise_id: r.exercise_id,
      label: r.label,
      sets: Number(r.sets) || null,
      reps: r.reps || null,
      load: r.load || null,
      rest_seconds: Number(r.rest_seconds) || null,
      order_index: index,
    }));

    const { error: exercisesError } = await supabase.from("workout_exercises").insert(payload);

    if (exercisesError) {
      setError("Treino criado, mas houve erro ao salvar os exercícios.");
      setSaving(false);
      return;
    }

    router.push(`/alunos/${studentId}`);
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <Card className="text-center text-blue">
        Você ainda não tem alunos ativos. Cadastre um aluno antes de criar um treino.
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Aluno</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nome do treino</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-navy">Exercícios</h2>
          <button
            type="button"
            onClick={() => setShowNewExercise((v) => !v)}
            className="text-sm text-orange hover:underline"
          >
            + Novo exercício na biblioteca
          </button>
        </div>

        {showNewExercise && (
          <Card className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="col-span-2 sm:flex-1 sm:min-w-[160px]">
              <label className="mb-1 block text-sm font-medium text-navy">Nome</label>
              <input
                value={newExercise.name}
                onChange={(e) => setNewExercise((v) => ({ ...v, name: e.target.value }))}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
            <div className="col-span-2 sm:flex-1 sm:min-w-[160px]">
              <label className="mb-1 block text-sm font-medium text-navy">Grupo muscular</label>
              <input
                value={newExercise.muscle_group}
                onChange={(e) => setNewExercise((v) => ({ ...v, muscle_group: e.target.value }))}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddExercise}
              className="col-span-2 sm:col-auto"
            >
              Adicionar
            </Button>
          </Card>
        )}

        {rows.map((row) => (
          <Card key={row.key} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
              <label className="mb-1 block text-sm font-medium text-navy">Exercício</label>
              <select
                value={row.exercise_id}
                onChange={(e) => updateRow(row.key, { exercise_id: e.target.value })}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              >
                <option value="">Selecione</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:w-24">
              <label className="mb-1 block text-sm font-medium text-navy">Treino</label>
              <select
                value={row.label}
                onChange={(e) => updateRow(row.key, { label: e.target.value })}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              >
                {TREINO_LABELS.map((l) => (
                  <option key={l} value={l}>
                    Treino {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:w-20">
              <label className="mb-1 block text-sm font-medium text-navy">Séries</label>
              <input
                value={row.sets}
                onChange={(e) => updateRow(row.key, { sets: e.target.value })}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <div className="sm:w-24">
              <label className="mb-1 block text-sm font-medium text-navy">Reps</label>
              <input
                value={row.reps}
                onChange={(e) => updateRow(row.key, { reps: e.target.value })}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <div className="sm:w-28">
              <label className="mb-1 block text-sm font-medium text-navy">Carga</label>
              <input
                value={row.load}
                onChange={(e) => updateRow(row.key, { load: e.target.value })}
                placeholder="20kg"
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <div className="sm:w-24">
              <label className="mb-1 block text-sm font-medium text-navy">Descanso (s)</label>
              <input
                value={row.rest_seconds}
                onChange={(e) => updateRow(row.key, { rest_seconds: e.target.value })}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              />
            </div>

            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              className="col-span-2 flex items-center justify-center gap-2 rounded-lg p-2 text-orange hover:bg-orange/10 sm:col-auto"
              aria-label="Remover exercício"
            >
              <Trash2 size={18} />
              <span className="sm:hidden">Remover</span>
            </button>
          </Card>
        ))}

        <button
          type="button"
          onClick={() =>
            setRows((prev) => [...prev, emptyRow(prev[prev.length - 1]?.label ?? "A")])
          }
          className="flex items-center gap-2 text-sm font-medium text-navy hover:text-blue"
        >
          <Plus size={16} />
          Adicionar exercício
        </button>
      </div>

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar treino"}
      </Button>
    </form>
  );
}
