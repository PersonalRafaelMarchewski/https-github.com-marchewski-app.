"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";
import Card from "@/components/Card";
import VolumeSummary from "@/components/VolumeSummary";
import ExercisePicker from "@/components/ExercisePicker";
import SetPresetPicker from "@/components/SetPresetPicker";
import DragHandle from "@/components/DragHandle";
import MuscleGroupSelect from "@/components/MuscleGroupSelect";
import { useSortableReorder } from "@/lib/useSortableReorder";
import { summarizeVolumeByPlan } from "@/lib/volume";
import { METHOD_OPTIONS, groupExercisesByMethod } from "@/lib/workoutMethods";
import { estimateBlockSeconds, formatDuration } from "@/lib/workoutTime";
import { isCardioGroup } from "@/lib/cardio";
import { levelLabel } from "@/lib/level";
import { notifyNewWorkout } from "@/app/(trainer)/treinos/novo/notify";

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

// "Number(x) || null" trata 0 como se fosse vazio (0 é falso em JS) — sem
// isso, diminuir séries/descanso até 0 salvava como nulo em vez de 0.
function numberOrNull(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

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
      {groups.map((group) =>
        group.items.length > 1 ? (
          <div
            key={group.items[0].key}
            className="space-y-2 rounded-xl border border-orange/40 bg-orange/5 p-2"
          >
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
  const [rows, setRows] = useState<Row[]>([]);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" });
  // muda a cada exercício cadastrado só pra "remontar" o seletor de grupo
  // muscular e sair do modo "outro (digitar)" se tiver ficado nele
  const [newExerciseFormKey, setNewExerciseFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // depois de uma tentativa de salvar que falhou por falta de exercício,
  // destaca exatamente as linhas em branco — sem isso, uma linha que não
  // renderizou direito (ex: bug de layout) fica impossível de achar
  const [showMissingExercise, setShowMissingExercise] = useState(false);

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

  const estimatedSeconds = useMemo(() => {
    const rowsWithMuscle = rows.map((row) => ({
      ...row,
      muscleGroup: exercises.find((e) => e.id === row.exercise_id)?.muscle_group ?? null,
    }));
    return estimateBlockSeconds(groupExercisesByMethod(rowsWithMuscle));
  }, [rows, exercises]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Reordena a lista de exercícios (sem mais conceito de bloco — é um
  // treino só, uma lista só).
  function reorderRows(newOrderKeys: string[]) {
    setRows((prev) => {
      const byKey = new Map(prev.map((r) => [r.key, r]));
      return newOrderKeys.map((k) => byKey.get(k)!);
    });
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
    setNewExerciseFormKey((k) => k + 1);
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
      setShowMissingExercise(true);
      setError(
        "Escolha um exercício em todas as linhas — a linha em branco está destacada em vermelho."
      );
      return;
    }
    setShowMissingExercise(false);

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
      sets: numberOrNull(r.sets),
      reps: r.reps || null,
      load: r.load || null,
      rest_seconds: numberOrNull(r.rest_seconds),
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
    const missingExercise = showMissingExercise && !row.exercise_id;

    return (
      <>
        <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
          <label className="mb-1 block text-sm font-medium text-navy">
            Exercício
            {missingExercise && (
              <span className="ml-1.5 font-normal text-orange">← escolha um exercício aqui</span>
            )}
          </label>
          <div className={missingExercise ? "rounded-lg ring-2 ring-orange" : undefined}>
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
      <Card className="space-y-6">
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

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange sm:w-56"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange sm:w-56"
          />
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
              <MuscleGroupSelect
                key={newExerciseFormKey}
                value={newExercise.muscle_group}
                onChange={(muscle_group) => setNewExercise((v) => ({ ...v, muscle_group }))}
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

        {rows.length === 0 && (
          <p className="text-sm text-blue">Nenhum exercício ainda.</p>
        )}

        {rows.length > 1 && (
          <p className="text-xs text-blue">Segure as ⠿ e arraste pra mudar a ordem.</p>
        )}

        <SortableBlockRows rows={rows} onReorder={reorderRows} renderRowFields={renderRowFields} />

        {rows.length > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-navy">
            <Clock size={14} className="text-orange" />
            Tempo estimado: ~{formatDuration(estimatedSeconds)}
          </p>
        )}

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="flex items-center gap-2 text-sm font-medium text-blue hover:text-navy"
        >
          <Plus size={14} />
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
