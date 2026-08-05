"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { saveTrainerFeedback } from "@/app/(trainer)/alunos/[id]/actions";

export default function TrainerFeedbackCard({
  logId,
  studentId,
  exerciseName,
  date,
  completed,
  difficultyRating,
  feedbackText,
  videoSignedUrl,
  initialTrainerRating,
  initialTrainerFeedback,
}: {
  logId: string;
  studentId: string;
  exerciseName: string;
  date: string;
  completed: boolean;
  difficultyRating: number | null;
  feedbackText: string | null;
  videoSignedUrl: string | null;
  initialTrainerRating: number | null;
  initialTrainerFeedback: string | null;
}) {
  const [rating, setRating] = useState(initialTrainerRating);
  const [text, setText] = useState(initialTrainerFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveTrainerFeedback(logId, studentId, rating, text);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const hasTrainerFeedback = Boolean(initialTrainerRating || initialTrainerFeedback);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-medium text-navy">{exerciseName}</p>
        <span className="text-sm text-blue">{date}</span>
      </div>
      <p className="mt-1 text-sm text-blue">
        {completed ? "Concluído" : "Não concluído"}
        {difficultyRating ? ` · dificuldade ${difficultyRating}/5` : ""}
      </p>
      {feedbackText && <p className="mt-1 text-sm italic text-navy">"{feedbackText}"</p>}

      {videoSignedUrl && (
        <video
          src={videoSignedUrl}
          controls
          className="mt-3 max-h-80 w-full rounded-lg bg-black"
        />
      )}

      {(videoSignedUrl || feedbackText) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 text-sm font-medium text-orange hover:underline"
        >
          {open
            ? "Fechar"
            : hasTrainerFeedback
              ? "Editar seu feedback"
              : "Avaliar a execução"}
        </button>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-lightblue/20 pt-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Nota de técnica</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                    rating === n ? "bg-orange text-white" : "bg-lightblue/20 text-navy hover:bg-lightblue/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Comentário</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
              placeholder="Como foi a execução? O que ajustar?"
            />
          </div>
          {error && <p className="text-sm text-orange">{error}</p>}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : saved ? "Feedback salvo" : "Salvar feedback"}
          </Button>
        </div>
      )}
    </Card>
  );
}
