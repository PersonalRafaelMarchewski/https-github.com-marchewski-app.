"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  createSession,
  updateSession,
  type SessionFormState,
} from "@/app/(trainer)/agenda/actions";
import { getHolidayName } from "@/lib/holidays";

const initialState: SessionFormState = { error: null };

const WEEKDAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

type Student = { id: string; name: string; serviceType?: string };

type InitialData = {
  studentId: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  durationMinutes: number;
  reminderMinutesBefore: number;
  notes: string;
};

export default function SessionForm({
  students,
  sessionId,
  initialData,
  defaultDate,
  defaultTime,
  isRecurring,
}: {
  students: Student[];
  sessionId?: string;
  initialData?: InitialData;
  defaultDate?: string;
  defaultTime?: string;
  isRecurring?: boolean;
}) {
  const isEdit = Boolean(sessionId);
  const action = isEdit ? updateSession.bind(null, sessionId as string) : createSession;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [applyScope, setApplyScope] = useState<"single" | "future">("single");
  const [selectedDate, setSelectedDate] = useState(initialData?.date ?? defaultDate ?? "");
  const holidayOnSelectedDate = selectedDate ? getHolidayName(selectedDate) : null;

  function handleToggleRecurrence(checked: boolean) {
    setShowRecurrence(checked);
  }

  const reminderMinutes = initialData?.reminderMinutesBefore ?? 30;
  const initialReminderUnit = reminderMinutes % 60 === 0 ? "horas" : "minutos";
  const initialReminderValue =
    initialReminderUnit === "horas" ? reminderMinutes / 60 : reminderMinutes;

  function toggleWeekday(value: number) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const personalStudents = students.filter((s) => s.serviceType === "personal");
  const assessoriaStudents = students.filter((s) => s.serviceType !== "personal");

  return (
    <Card className="max-w-lg">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Aluno</label>
          <select
            name="student_id"
            defaultValue={initialData?.studentId ?? students[0]?.id ?? ""}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            {personalStudents.length > 0 && (
              <optgroup label="Personal">
                {personalStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {assessoriaStudents.length > 0 && (
              <optgroup label="Assessoria">
                {assessoriaStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Título <span className="font-normal text-blue">(opcional)</span>
          </label>
          <input
            name="title"
            defaultValue={initialData?.title ?? ""}
            placeholder="Ex: Treino de pernas"
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Data</label>
            <input
              type="date"
              name="date"
              defaultValue={initialData?.date ?? defaultDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
            {holidayOnSelectedDate && (
              <p className="mt-1 text-xs text-orange">Feriado: {holidayOnSelectedDate}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Horário</label>
            <input
              type="time"
              name="time"
              defaultValue={initialData?.time ?? defaultTime ?? "07:00"}
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Duração (minutos)</label>
          <input
            type="number"
            name="duration_minutes"
            min={15}
            step={15}
            defaultValue={initialData?.durationMinutes ?? 60}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Lembrete (push)</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="reminder_value"
              min={1}
              defaultValue={initialReminderValue}
              className="w-24 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
            <select
              name="reminder_unit"
              defaultValue={initialReminderUnit}
              className="flex-1 rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="minutos">minutos antes</option>
              <option value="horas">horas antes</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Observações <span className="font-normal text-blue">(opcional)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initialData?.notes ?? ""}
            placeholder="Ex: local, o que levar, etc."
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        {!isEdit && (
          <div className="rounded-lg border border-lightblue/50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-navy">
              <input
                type="checkbox"
                checked={showRecurrence}
                onChange={(e) => handleToggleRecurrence(e.target.checked)}
              />
              Repetir toda semana
            </label>

            {showRecurrence && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-xs text-blue">Em quais dias</p>
                  <div className="flex gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <label key={d.value}>
                        <input
                          type="checkbox"
                          name="weekdays"
                          value={d.value}
                          checked={weekdays.includes(d.value)}
                          onChange={() => toggleWeekday(d.value)}
                          className="peer hidden"
                        />
                        <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm font-medium text-blue peer-checked:bg-navy peer-checked:text-white hover:bg-lightblue/20">
                          {d.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-blue">
                    Repetir até <span className="font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    name="repeat_until"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                  />
                  <p className="mt-1 text-xs text-blue">
                    Deixe em branco pra repetir sem data final.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {isEdit && isRecurring && (
          <div className="rounded-lg border border-lightblue/50 p-3">
            <p className="mb-2 text-sm font-medium text-navy">
              Essa aula faz parte de uma série recorrente. Aplicar as mudanças a:
            </p>
            <input type="hidden" name="apply_scope" value={applyScope} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setApplyScope("single")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  applyScope === "single"
                    ? "border-navy bg-navy text-white"
                    : "border-lightblue/50 text-navy hover:bg-lightblue/10"
                }`}
              >
                Só esta aula
              </button>
              <button
                type="button"
                onClick={() => setApplyScope("future")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  applyScope === "future"
                    ? "border-navy bg-navy text-white"
                    : "border-lightblue/50 text-navy hover:bg-lightblue/10"
                }`}
              >
                Esta e as futuras
              </button>
            </div>
            {applyScope === "future" && (
              <p className="mt-2 text-xs text-blue">
                O horário, aluno, título e observações mudam em todas as aulas futuras dessa
                série — cada uma mantém sua própria data.
              </p>
            )}
          </div>
        )}

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar aula" : "Criar aula"}
        </Button>
      </form>
    </Card>
  );
}
