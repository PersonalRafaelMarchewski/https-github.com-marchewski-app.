"use client";

import { useRef, useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getExerciseVideoUploadUrl } from "@/app/(trainer)/exercicios/video-actions";
import { compressVideoIfNeeded } from "@/lib/videoCompression";

const BUCKET = "exercise-library-videos";
const SUPABASE_LIMIT_BYTES = 50 * 1024 * 1024;

// Campo de "URL do vídeo" continua existindo (pra quem prefere colar um
// link do YouTube etc.), mas agora também dá pra gravar/enviar o arquivo
// direto — ele sobe pro Storage e o link público preenche o mesmo campo.
export default function ExerciseVideoUploadField({
  videoUrl,
  onChange,
  uploadKey,
}: {
  videoUrl: string;
  onChange: (url: string) => void;
  uploadKey: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setError(null);

    let toUpload = file;
    if (file.size > SUPABASE_LIMIT_BYTES) {
      setCompressing(true);
      setCompressProgress(0);
      try {
        toUpload = await compressVideoIfNeeded(file, setCompressProgress);
      } catch {
        setCompressing(false);
        setError(
          "Não foi possível compactar o vídeo automaticamente. Tenta gravar um vídeo mais curto ou em qualidade menor."
        );
        return;
      }
      setCompressing(false);

      if (toUpload.size > SUPABASE_LIMIT_BYTES) {
        setError(
          "Mesmo compactado, o vídeo ainda passou de 50MB. Tenta um vídeo mais curto."
        );
        return;
      }
    }

    setUploading(true);
    try {
      const ext = toUpload.name.split(".").pop() || "mp4";
      const { path, token } = await getExerciseVideoUploadUrl(uploadKey, ext);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(path, token, toUpload);

      if (uploadError) throw uploadError;

      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      onChange(`${base}/storage/v1/object/public/${BUCKET}/${path}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : null;
      setError(
        detail
          ? `Não foi possível enviar o vídeo (${detail}). Tenta de novo?`
          : "Não foi possível enviar o vídeo. Tenta de novo?"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-blue">
        Vídeo <span className="font-normal">(link ou envie um arquivo)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={videoUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="min-w-0 flex-1 rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || compressing}
          className="flex flex-none items-center gap-1.5 rounded-lg border border-lightblue/50 px-3 py-2 text-sm font-medium text-navy hover:bg-lightblue/10 disabled:opacity-50"
        >
          {uploading || compressing ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Video size={15} />
          )}
          {compressing
            ? `Compactando... ${Math.round(compressProgress * 100)}%`
            : uploading
              ? "Enviando..."
              : "Enviar vídeo"}
        </button>
      </div>
      {compressing && (
        <p className="mt-1 text-xs text-blue">
          Vídeo maior que 50MB — compactando automaticamente antes de enviar (pode levar um
          minuto).
        </p>
      )}
      {error && <p className="mt-1 text-xs text-orange">{error}</p>}
    </div>
  );
}
