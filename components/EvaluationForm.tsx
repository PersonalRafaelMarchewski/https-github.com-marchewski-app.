"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Card from "@/components/Card";
import Button from "@/components/Button";

const MEASUREMENT_FIELDS = [
  { key: "cintura", label: "Cintura (cm)" },
  { key: "quadril", label: "Quadril (cm)" },
  { key: "peito", label: "Peito (cm)" },
  { key: "braco", label: "Braço (cm)" },
  { key: "coxa", label: "Coxa (cm)" },
];

type InitialData = {
  date: string;
  weight: number | null;
  body_fat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EvaluationForm({
  studentId,
  evaluationId,
  initialData,
}: {
  studentId: string;
  evaluationId?: string;
  initialData?: InitialData;
}) {
  const router = useRouter();
  const isEdit = Boolean(evaluationId);

  const [date, setDate] = useState(initialData?.date ?? today());
  const [weight, setWeight] = useState(initialData?.weight?.toString() ?? "");
  const [bodyFat, setBodyFat] = useState(initialData?.body_fat?.toString() ?? "");
  const [measurements, setMeasurements] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialData?.measurements ?? {}).map(([k, v]) => [k, String(v)])
    )
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const measurementsPayload = Object.fromEntries(
      Object.entries(measurements)
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => [k, Number(v)])
    );

    const payload = {
      date,
      weight: weight ? Number(weight) : null,
      body_fat: bodyFat ? Number(bodyFat) : null,
      measurements: Object.keys(measurementsPayload).length > 0 ? measurementsPayload : null,
      notes: notes || null,
    };

    const supabase = createClient();
    const { error: saveError } = isEdit
      ? await supabase.from("evaluations").update(payload).eq("id", evaluationId)
      : await supabase.from("evaluations").insert({ student_id: studentId, ...payload });

    if (saveError) {
      setError("Não foi possível salvar a avaliação.");
      setSaving(false);
      return;
    }

    router.push(`/alunos/${studentId}`);
    router.refresh();
  }

  return (
    <Card className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Peso (kg)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">% Gordura</label>
            <input
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-navy">Medidas (cm)</p>
          <div className="grid grid-cols-2 gap-4">
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs text-blue">{f.label}</label>
                <input
                  value={measurements[f.key] ?? ""}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  inputMode="decimal"
                  className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        {error && <p className="text-sm text-orange">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar avaliação"}
        </Button>
      </form>
    </Card>
  );
}
