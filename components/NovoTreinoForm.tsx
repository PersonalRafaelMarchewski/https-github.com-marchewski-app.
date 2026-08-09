"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";
import VolumeSummary from "@/components/VolumeSummary";
import ExercisePicker from "@/components/ExercisePicker";
import SetPresetPicker from "@/components/SetPresetPicker";
import DragHandle from "@/components/DragHandle";
import { useSortableReorder } from "@/lib/useSortableReorder";
import { summarizeVolumeByPlan } from "@/lib/volume";
import { METHOD_OPTIONS, groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds, formatDuration } from "@/lib/workoutTime";
import { isCardioGroup } from "@/lib/cardio";
import { levelLabel } from "@/lib/level";
import { notifyNewWorkout } from "@/app/(trainer)/treinos/novo/notify";

const TREINO_LABELS = ["A", "B", "C", "D", "E", "F"];

type Student = { id: string; name: string; level?: string | null };
type Exercise = { id: string; name: string; muscle_group: string | null };

type Row = {
  key: string;
  exercise_id: string;
  label: string;
  sets: string;
  reps: string;
  load: string;
  rest_seconds: string;
  method: string;
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
    method: "",
  };
}

// Lista arrastável dos exercícios de um bloco — precisa ser um componente
// à parte porque o hook de arrastar só pode ser chamado uma vez por
// instância, e a quantidade de blocos muda conforme o personal adiciona.
function SortableBlockRows({
  rows,
  onReorder,
  renderRowFields,
}: {
  rows: Row[];
  onReorder: (newOrderKeys: string[]) => void;
  renderRowFields: (row: Row) => React.ReactNode;
}) {
  const keys = rows.map((r) => r.key);
  const { draggingKey, startDrag, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useSortableReorder(keys, onReorder);

  const groups = groupExercisesByMethod(rows);

  return (
    <>
      {groups.map((group, gi) =>
        group.items.length > 1 ? (
          <div key={gi} className="space-y-2 rounded-xl border border-orange/40 bg-orange/5 p-2">
            <span className="ml-1 inline-block rounded-full bg-orange/15 px-2.5 py-1 text-xs font-semibold text-orange">
              {group.method} · sem descanso entre eles
            </span>
            {group.items.map((row) => (
              <div
                key={row.key}
                data-sortable-key={row.key}
                className={`flex items-stretch gap-1 ${draggingKey === row.key ? "opacity-50" : ""}`}
              >
                <DragHandle
                  onPointerDown={startDrag(row.key)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                />
                <Card className="grid flex-1 grid-cols-2 gap-3 border-l-4 border-l-orange sm:flex sm:flex-wrap sm:items-end">
                  {renderRowFields(row)}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div
            key={group.items[0].key}
            data-sortable-key={group.items[0].key}
            className={`flex items-stretch gap-1 ${draggingKey === group.items[0].key ? "opacity-50" : ""}`}
          >
            <DragHandle
              onPointerDown={startDrag(group.items[0].key)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
            <Card className="grid flex-1 grid-cols-2 gap-3 border-l-4 border-l-navy sm:flex sm:flex-wrap sm:items-end">
              {renderRowFields(group.items[0])}
            </Card>
          </div>
        )
      )}
    </>
  );
}

export default function NovoTreinoForm({
  students,
  exercises: initialExercises,
  defaultStudentId,
}: {
  students: Student[];
  exercises: Exercise[];
  defaultStudentId?: string;
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [studentId, setStudentId] = useState(
    defaultStudentId && students.some((s) => s.id === defaultStudentId)
      ? defaultStudentId
      : (students[0]?.id ?? "")
  );
  const selectedStudent = students.find((s) => s.id === studentId);
  const [name, setName] = useState("Treino");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [blocks, setBlocks] = useState<string[]>(["A"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const volumeRows = useMemo(
    () =>
      summarizeVolumeByPlan(
        rows
          .filter((r) => r.exercise_id)
          .map((r) => ({
            muscleGroup: exercises.find((e) => e.id === r.exercise_id)?.muscle_group ?? null,
            label: r.label,
            sets: Number(r.sets) || 0,
          }))
      ),
    [rows, exercises]
  );

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Reordena só as linhas de um bloco (label), mantendo a posição relativa
  // dos exercícios dos outros blocos intacta — o order_index final vem da
  // posição de cada linha no array inteiro, então isso já basta.
  function reorderLabelRows(label: string, newOrderKeys: string[]) {
    setRows((prev) => {
      const byKey = new Map(prev.map((r) => [r.key, r]));
      let cursor = 0;
      return prev.map((r) => (r.label === label ? byKey.get(newOrderKeys[cursor++])! : r));
    });
  }

  function addBlock() {
    setBlocks((prev) => {
      const nextLabel = TREINO_LABELS.find((l) => !prev.includes(l));
      return nextLabel ? [...prev, nextLabel] : prev;
    });
  }

  function removeBlock(label: string) {
    setBlocks((prev) => prev.filter((l) => l !== label));
    setRows((prev) => prev.filter((r) => r.label !== label));
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
    if (rows.length === 0) {
      setError("Adicione pelo menos um exercício.");
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
      method: r.method || null,
      order_index: index,
    }));

    const { error: exercisesError } = await supabase.from("workout_exercises").insert(payload);

    if (exercisesError) {
      setError("Treino criado, mas houve erro ao salvar os exercícios.");
      setSaving(false);
      return;
    }

    notifyNewWorkout(studentId, name).catch(() => {
      // notificação é best-effort, não deve travar o fluxo de criação do treino
    });

    router.push(`/alunos/${studentId}`);
  }

  function renderRowFields(row: Row) {
    const exercise = exercises.find((e) => e.id === row.exercise_id);
    const cardio = isCardioGroup(exercise?.muscle_group);

    return (
      <>
        <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
          <label className="mb-1 block text-sm font-medium text-navy">Exercício</label>
          <ExercisePicker
            exercises={exercises}
            value={row.exercise_id}
            onChange={(id) => {
              const picked = exercises.find((e) => e.id === id);
              const patch: Partial<Row> = { exercise_id: id };
              if (isCardioGroup(picked?.muscle_group)) {
                if (row.reps === "10-12") patch.reps = "20 min";
                if (row.sets === "3") patch.sets = "1";
              }
              updateRow(row.key, patch);
            }}
          />
        </div>

        <div className="sm:w-24">
          <label className="mb-1 block text-sm font-medium text-navy">Treino</label>
          <select
            value={row.label}
            onChange={(e) => updateRow(row.key, { label: e.target.value })}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            {blocks.map((l) => (
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
          <label className="mb-1 block text-sm font-medium text-navy">
            {cardio ? "Duração" : "Reps"}
          </label>
          <input
            placeholder={cardio ? "20 min" : undefined}
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

        <div className="sm:w-36">
          <label className="mb-1 block text-sm font-medium text-navy">Método</label>
          <select
            value={row.method}
            onChange={(e) => updateRow(row.key, { method: e.target.value })}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="">Normal</option>
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-28">
          <label className="mb-1 block text-sm font-medium text-navy">&nbsp;</label>
          <SetPresetPicker className="w-full py-2" onApply={(preset) => updateRow(row.key, preset)} />
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
      </>
    );
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
          {selectedStudent && (
            <p className="mt-1 text-xs text-blue">
              Nível: <span className="font-medium">{levelLabel(selectedStudent.level)}</span>
            </p>
          )}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Blocos de treino</label>
          <div className="flex flex-wrap items-center gap-2">
            {blocks.map((label) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-sm font-semibold text-white"
              >
                Treino {label}
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(label)}
                    aria-label={`Remover Treino ${label}`}
                    className="text-white/70 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </span>
            ))}
            {blocks.length < TREINO_LABELS.length && (
              <button
                type="button"
                onClick={addBlock}
                className="flex items-center gap-1 rounded-full border border-dashed border-lightblue/50 px-3 py-1.5 text-sm font-medium text-navy hover:border-orange hover:text-orange"
              >
                <Plus size={14} />
                Novo bloco
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-blue">
            Defina quantos blocos esse treino vai ter (ex: A, B, C) antes de escolher os
            exercícios lá embaixo.
          </p>
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

        <VolumeSummary
          title="Volume por grupo muscular (nesse treino)"
          rows={volumeRows}
          frequencyLabel={(f) => `${f}x/sem`}
          emptyMessage="Adicione exercícios pra ver o volume e a frequência por grupo muscular."
        />

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

        {blocks.map((label) => {
          const labelRows = rows.filter((row) => row.label === label);
          const labelRowsWithMuscle = labelRows.map((row) => ({
            ...row,
            muscleGroup: exercises.find((e) => e.id === row.exercise_id)?.muscle_group ?? null,
          }));
          const estimatedSeconds = estimateBlockSeconds(groupExercisesByMethod(labelRowsWithMuscle));

          return (
            <div key={label} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy font-heading text-xs font-bold text-white">
                  {label}
                </span>
                <p className="font-heading text-sm font-semibold text-navy">Treino {label}</p>
              </div>

              {labelRows.length === 0 && (
                <p className="text-sm text-blue">Nenhum exercício ainda nesse bloco.</p>
              )}

              {labelRows.length > 1 && (
                <p className="text-xs text-blue">Segure as ⠿ e arraste pra mudar a ordem.</p>
              )}

              <SortableBlockRows
                rows={labelRows}
                onReorder={(newOrderKeys) => reorderLabelRows(label, newOrderKeys)}
                renderRowFields={renderRowFields}
              />

              {labelRows.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-navy">
                  <Clock size={14} className="text-orange" />
                  Tempo estimado do Treino {label}: ~{formatDuration(estimatedSeconds)}
                </p>
              )}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow(label)])}
                className="flex items-center gap-2 text-sm font-medium text-blue hover:text-navy"
              >
                <Plus size={14} />
                Adicionar exercício ao Treino {label}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-orange">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar treino"}
      </Button>
    </form>
  );
}
