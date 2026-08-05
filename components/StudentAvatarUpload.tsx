"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, User, X } from "lucide-react";
import { compressImage } from "@/lib/image";
import { saveStudentAvatar, removeStudentAvatar } from "@/app/(trainer)/alunos/[id]/actions";

export default function StudentAvatarUpload({
  studentId,
  initialSignedUrl,
}: {
  studentId: string;
  initialSignedUrl: string | null;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialSignedUrl);
  const [hasAvatar, setHasAvatar] = useState(Boolean(initialSignedUrl));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setSaving(true);
    try {
      const compressed = await compressImage(file, { maxDimension: 600, quality: 0.85 });
      setPreviewUrl(URL.createObjectURL(compressed));

      const formData = new FormData();
      formData.set("avatar", compressed);
      await saveStudentAvatar(studentId, formData);
      setHasAvatar(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setSaving(true);
    try {
      await removeStudentAvatar(studentId);
      setPreviewUrl(null);
      setHasAvatar(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/40 text-navy">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Foto do aluno" className="h-full w-full object-cover" />
        ) : (
          <User size={28} />
        )}
      </div>

      <div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
          >
            <Camera size={15} />
            {saving ? "Salvando..." : "Tirar foto"}
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
          >
            <ImageIcon size={15} />
            {saving ? "Salvando..." : "Da galeria"}
          </button>
          {hasAvatar && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-medium text-blue hover:underline disabled:opacity-50"
            >
              <X size={15} />
              Remover
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-orange">{error}</p>}
      </div>
    </div>
  );
}
