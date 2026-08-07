"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { saveEvaluationPhoto } from "@/app/(trainer)/alunos/[id]/avaliacoes/photos-actions";
import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "@/lib/evaluationFields";

type InitialData = {
  date: string;
  weight: number | null;
  height: number | null;
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
  photoUrls,
}: {
  studentId: string;
  evaluationId?: string;
  initialData?: InitialData;
  photoUrls?: (string | null)[];
}) {
  const router = useRouter();
  const isEdit = Boolean(evaluationId);

  const [date, setDate] = useState(initialData?.date ?? today());
  const [weight, setWeight] = useState(initialData?.weight?.toString() ?? "");
  const [height, setHeight] = useState(initialData?.height?.toString() ?? "");
  const [bodyFat, setBodyFat] = useState(initialData?.body_fat?.toString() ?? "");
  const [measurements, setMeasurements] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialData?.measurements ?? {}).map(([k, v]) => [k, String(v)])
    )
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [removedSlots, setRemovedSlots] = useState<boolean[]>([false, false, false, false]);
  const [processingPhoto, setProcessingPhoto] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setPhotoFile(index: number, file: File | null) {
    setPhotoFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
    if (file) setRemovedSlots((prev) => prev.map((r, i) => (i === index ? false : r)));
  }

  async function handlePhotoSelect(index: number, file: File | null) {
    if (!file) {
      setPhotoFile(index, null);
      return;
    }
    setProcessingPhoto(index);
    try {
      const compressed = await compressImage(file);
      setPhotoFile(index, compressed);
    } finally {
      setProcessingPhoto(null);
    }
  }

  function removeExistingPhoto(index: number) {
    setRemovedSlots((prev) => prev.map((r, i) => (i === index ? true : r)));
    setPhotoFile(index, null);
  }

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
      height: height ? Number(height) : null,
      body_fat: bodyFat ? Number(bodyFat) : null,
      measurements: Object.keys(measurementsPayload).length > 0 ? measurementsPayload : null,
      notes: notes || null,
    };

    const supabase = createClient();
    let resultId = evaluationId ?? null;

    if (isEdit) {
      const { error: saveError } = await supabase
        .from("evaluations")
        .update(payload)
        .eq("id", evaluationId);
      if (saveError) {
        setError("Não foi possível salvar a avaliação.");
        setSaving(false);
        return;
      }
    } else {
      const { data, error: saveError } = await supabase
        .from("evaluations")
        .insert({ student_id: studentId, ...payload })
        .select("id")
        .single();
      if (saveError || !data) {
        setError("Não foi possível salvar a avaliação.");
        setSaving(false);
        return;
      }
      resultId = data.id;
    }

    if (resultId) {
      // Envia uma foto por vez (em vez de todas de uma vez): cada
      // requisição fica pequena e não esbarra no limite de tamanho do
      // servidor mesmo com fotos grandes.
      for (let i = 0; i < 4; i++) {
        const file = photoFiles[i];
        const removed = removedSlots[i];
        if (!file && !removed) continue;

        const formData = new FormData();
        if (file) formData.set("photo", file);
        if (removed) formData.set("remove", "true");

        try {
          await saveEvaluationPhoto(resultId, studentId, i, formData);
        } catch (err) {
          setError(
            err instanceof Error
              ? `Foto ${i + 1}: ${err.message}`
              : `Erro ao salvar a foto ${i + 1}.`
          );
          setSaving(false);
          return;
        }
      }
    }

    router.push(`/alunos/${studentId}`);
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

        <div className="grid grid-cols-3 gap-3">
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
            <label className="mb-1 block text-sm font-medium text-navy">Altura (cm)</label>
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
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
          <p className="mb-2 text-sm font-medium text-navy">Circunferências (cm)</p>
          <div className="grid grid-cols-2 gap-4">
            {CIRCUMFERENCE_FIELDS.map((f) => (
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
          <p className="mb-2 text-sm font-medium text-navy">Dobras cutâneas (mm)</p>
          <div className="grid grid-cols-2 gap-4">
            {SKINFOLD_FIELDS.map((f) => (
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
          <p className="mb-2 text-sm font-medium text-navy">Fotos (até 4)</p>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => {
              const existingUrl = !removedSlots[i] ? photoUrls?.[i] : null;
              const newPreview = photoFiles[i] ? URL.createObjectURL(photoFiles[i] as File) : null;
              const previewSrc = newPreview ?? existingUrl;

              return (
                <div key={i} className="relative">
                  {previewSrc ? (
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-lightblue/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewSrc} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(i, null);
                          if (photoUrls?.[i]) removeExistingPhoto(i);
                        }}
                        className="absolute right-1 top-1 rounded-full bg-navy/80 p-1 text-white"
                        aria-label="Remover foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-lightblue/50 text-xs text-blue hover:border-orange">
                      {processingPhoto === i ? "Processando..." : `Foto ${i + 1}`}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={processingPhoto === i}
                        onChange={(e) => handlePhotoSelect(i, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              );
            })}
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

        <Button type="submit" disabled={saving || processingPhoto !== null} className="w-full">
          {saving ? "Salvando..." : "Salvar avaliação"}
        </Button>
      </form>
    </Card>
  );
}
