"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getExercisePhotoUploadUrl } from "@/app/(trainer)/exercicios/photo-actions";

const BUCKET = "exercise-library-photos";

// Pra exercícios sem vídeo gravado (aparelho específico, sem tempo de
// filmar etc.) — uma foto do aparelho já ajuda o aluno a achar na
// academia. Mesma mecânica do upload de vídeo, só que sem compactação
// (foto já é leve) e com "capture" pra abrir a câmera direto no celular.
export default function ExercisePhotoUploadField({
  imageUrl,
  onChange,
  uploadKey,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
  uploadKey: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const { path, token } = await getExercisePhotoUploadUrl(uploadKey, ext);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(path, token, file);

      if (uploadError) throw uploadError;

      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      onChange(`${base}/storage/v1/object/public/${BUCKET}/${path}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      setError(
        detail ? `Não foi possível enviar a foto (${detail}). Tenta de novo?` : "Não foi possível enviar a foto. Tenta de novo?"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-blue">
        Foto do aparelho <span className="font-normal">(opcional, pra quando não tem vídeo)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Foto do exercício"
            className="h-12 w-12 flex-none rounded-lg border border-lightblue/50 object-cover"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-none items-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-2 text-sm font-medium text-navy hover:bg-lightblue/10 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          {uploading ? "Enviando..." : imageUrl ? "Trocar foto" : "Enviar foto"}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sm font-medium text-blue hover:underline"
          >
            Remover
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-orange">{error}</p>}
    </div>
  );
}
