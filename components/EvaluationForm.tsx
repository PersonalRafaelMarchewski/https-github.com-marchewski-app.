"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  saveEvaluationPhoto,
  saveBioimpedance,
} from "@/app/(trainer)/alunos/[id]/avaliacoes/photos-actions";
import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "@/lib/evaluationFields";
import { todayInBrazil } from "@/lib/date";

type InitialData = {
  date: string;
  weight: number | null;
  height: number | null;
  body_fat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
  next_assessment_date?: string | null;
};

function today() {
  return todayInBrazil();
}

export default function EvaluationForm({
  studentId,
  evaluationId,
  initialData,
  photoUrls,
  bioimpedanceUrl,
}: {
  studentId: string;
  evaluationId?: string;
  initialData?: InitialData;
  photoUrls?: (string | null)[];
  // URL assinada do laudo já anexado (edição) — null/undefined = sem laudo
  bioimpedanceUrl?: string | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(evaluationId);

  // laudo de bioimpedância: arquivo novo escolhido e/ou remoção do atual
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [bioRemoved, setBioRemoved] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  async function handleBioSelect(file: File | null) {
    setBioError(null);
    if (!file) {
      setBioFile(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setBioError("Anexe um PDF ou uma foto do laudo.");
      return;
    }
    // imagem grande (foto do laudo) é comprimida; PDF vai como está, mas o
    // servidor aceita no máximo ~4MB por envio
    const prepared = file.type.startsWith("image/") ? await compressImage(file) : file;
    if (prepared.size > 4 * 1024 * 1024) {
      setBioError("Arquivo muito grande (máx. 4MB). Se for PDF, tenta exportar em qualidade menor.");
      return;
    }
    setBioFile(prepared);
    setBioRemoved(false);
  }

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
  const [nextAssessmentDate, setNextAssessmentDate] = useState(
    initialData?.next_assessment_date ?? ""
  );
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
      next_assessment_date: nextAssessmentDate || null,
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

      // laudo de bioimpedância (um arquivo só, envio separado das fotos)
      if (bioFile || bioRemoved) {
        const formData = new FormData();
        if (bioFile) formData.set("file", bioFile);
        if (bioRemoved && !bioFile) formData.set("remove", "true");
        try {
          await saveBioimpedance(resultId, studentId, formData);
        } catch (err) {
          setError(
            err instanceof Error ? `Bioimpedância: ${err.message}` : "Erro ao salvar a bioimpedância."
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
          <p className="mb-1 text-sm font-medium text-navy">
            Bioimpedância <span className="font-normal text-blue">(opcional)</span>
          </p>
          <p className="mb-2 text-xs text-blue">
            Anexa o laudo do aparelho — PDF ou foto da tela/impresso.
          </p>
          {bioFile ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-lightblue/50 bg-lightblue/10 px-3 py-2 text-sm text-navy">
              <span className="truncate">📎 {bioFile.name}</span>
              <button
                type="button"
                onClick={() => setBioFile(null)}
                className="flex-none rounded-full p-1 text-blue hover:bg-lightblue/20"
                aria-label="Remover arquivo escolhido"
              >
                <X size={14} />
              </button>
            </div>
          ) : bioimpedanceUrl && !bioRemoved ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-lightblue/50 bg-lightblue/10 px-3 py-2 text-sm">
              <a
                href={bioimpedanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-navy hover:underline"
              >
                📎 Ver laudo anexado
              </a>
              <button
                type="button"
                onClick={() => setBioRemoved(true)}
                className="flex-none rounded-full p-1 text-blue hover:bg-lightblue/20"
                aria-label="Remover laudo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-lightblue/50 px-3 py-3 text-sm text-blue hover:border-orange">
              Escolher arquivo (PDF ou imagem)
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleBioSelect(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {bioError && <p className="mt-1 text-xs text-orange">{bioError}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Próxima avaliação <span className="font-normal text-blue">(opcional)</span>
          </label>
          <input
            type="date"
            value={nextAssessmentDate}
            onChange={(e) => setNextAssessmentDate(e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange sm:w-52"
          />
          <p className="mt-1 text-xs text-blue">
            Marca quando reavaliar de novo — vai aparecer um aviso pra você quando chegar a data.
          </p>
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
