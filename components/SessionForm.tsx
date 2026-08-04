"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  createSession,
  updateSession,
  type SessionFormState,
} from "@/app/(trainer)/agenda/actions";

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
}: {
  students: Student[];
  sessionId?: string;
  initialData?: InitialData;
  defaultDate?: string;
}) {
  const isEdit = Boolean(sessionId);
  const action = isEdit ? updateSession.bind(null, sessionId as string) : createSession;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const reminderMinutes = initialData?.reminderMinutesBefore ?? 60;
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
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Horário</label>
            <input
              type="time"
              name="time"
              defaultValue={initialData?.time ?? "07:00"}
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
                onChange={(e) => setShowRecurrence(e.target.checked)}
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
                  <label className="mb-1 block text-xs text-blue">Repetir até</label>
                  <input
                    type="date"
                    name="repeat_until"
                    className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
                  />
                </div>
              </div>
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
