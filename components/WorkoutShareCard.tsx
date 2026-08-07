"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Camera, Image as ImageIcon, X } from "lucide-react";
import Button from "@/components/Button";
import { compressImage } from "@/lib/image";
import {
  ORANGE,
  loadImage,
  loadImageFromFile,
  drawDefaultBackground,
  drawPhotoBackground,
} from "@/lib/shareCardUtils";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

export default function WorkoutShareCard({
  exerciseCount,
  totalKg,
  dateIso,
}: {
  exerciseCount: number;
  totalKg?: number | null;
  dateIso: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [bgPhoto, setBgPhoto] = useState<HTMLImageElement | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    setShareSupported(
      typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof navigator.canShare === "function"
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;

      if (bgPhoto) {
        drawPhotoBackground(ctx, bgPhoto, bgPhoto.width, bgPhoto.height, CANVAS_W, CANVAS_H);
      } else {
        drawDefaultBackground(ctx, CANVAS_W, CANVAS_H, 320);
      }

      ctx.textAlign = "center";

      // frase de comemoração — lá em cima, deixando o meio do card livre
      // pra foto de fundo respirar
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 64px Arial";
      ctx.fillText("MAIS UM TREINO", CANVAS_W / 2, 260);
      ctx.fillStyle = ORANGE;
      ctx.fillText("NA CONTA! 💪", CANVAS_W / 2, 340);

      // linha de estatísticas — exercícios e kg movidos (sem tempo)
      const statsY = 460;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "600 42px Arial";
      const statsParts: string[] = [];
      statsParts.push(`${exerciseCount} exercício${exerciseCount === 1 ? "" : "s"}`);
      if (totalKg && totalKg > 0) statsParts.push(`${Math.round(totalKg)}kg movidos`);
      ctx.fillText(statsParts.join(" · "), CANVAS_W / 2, statsY);

      // divisor
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 160, statsY + 70);
      ctx.lineTo(CANVAS_W / 2 + 160, statsY + 70);
      ctx.stroke();

      // marca — logo grande no rodapé (em vez do nome do aluno + logo
      // pequeno em cima, fica só a marca, com bem mais presença)
      const logo = await loadImage("/logo-negativo.png");
      if (cancelled) return;

      const badgeCenterY = CANVAS_H - 220;
      if (logo) {
        const logoW = 420;
        const logoH = logoW * (logo.height / logo.width);
        ctx.drawImage(logo, (CANVAS_W - logoW) / 2, badgeCenterY - logoH - 66, logoW, logoH);
      }

      // selinho "personal trainer" — em destaque, laranja, embaixo da marca
      const tag = "P E R S O N A L   T R A I N E R";
      ctx.font = "800 27px Arial";
      const tagPaddingX = 32;
      const tagW = ctx.measureText(tag).width + tagPaddingX * 2;
      const tagH = 54;
      const tagX = (CANVAS_W - tagW) / 2;
      const tagY = badgeCenterY - tagH / 2;
      const tagR = tagH / 2;
      ctx.beginPath();
      ctx.moveTo(tagX + tagR, tagY);
      ctx.arcTo(tagX + tagW, tagY, tagX + tagW, tagY + tagH, tagR);
      ctx.arcTo(tagX + tagW, tagY + tagH, tagX, tagY + tagH, tagR);
      ctx.arcTo(tagX, tagY + tagH, tagX, tagY, tagR);
      ctx.arcTo(tagX, tagY, tagX + tagW, tagY, tagR);
      ctx.closePath();
      ctx.fillStyle = ORANGE;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(tag, CANVAS_W / 2, tagY + tagH / 2 + 2);
      ctx.textBaseline = "alphabetic";

      if (!cancelled) setReady(true);
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [exerciseCount, totalKg, dateIso, bgPhoto]);

  async function handlePhotoSelected(file: File | null) {
    if (!file) return;
    setLoadingPhoto(true);
    setPhotoError(null);

    // fotos da galeria que só existem na nuvem (ex: Google Fotos ainda não
    // baixada no aparelho) às vezes chegam como um arquivo vazio/quase vazio
    if (file.size < 1024) {
      setPhotoError("Essa foto parece não estar salva no aparelho ainda. Tenta outra ou tira uma foto na hora.");
      setLoadingPhoto(false);
      return;
    }

    try {
      const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.85 });
      const img = await loadImageFromFile(compressed);
      if (!img) {
        setPhotoError("Não conseguimos usar essa foto. Tenta outra ou tira uma foto na hora.");
        return;
      }
      setBgPhoto(img);
    } catch {
      setPhotoError("Não conseguimos usar essa foto. Tenta outra ou tira uma foto na hora.");
    } finally {
      setLoadingPhoto(false);
    }
  }

  async function getBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function handleDownload() {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treino-${dateIso}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], `treino-${dateIso}.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Treino concluído!",
          text: "Mais um treino concluído 💪",
        });
        return;
      } catch {
        // usuário cancelou o compartilhamento — sem erro pro app
        return;
      }
    }
    handleDownload();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-xs overflow-hidden rounded-2xl shadow-lg">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePhotoSelected(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePhotoSelected(e.target.files?.[0] ?? null)}
      />

      {bgPhoto ? (
        <button
          type="button"
          onClick={() => setBgPhoto(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue hover:underline"
        >
          <X size={15} />
          Remover foto de fundo
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={loadingPhoto}
            className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
          >
            <Camera size={16} />
            {loadingPhoto ? "Carregando..." : "Tirar foto"}
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={loadingPhoto}
            className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
          >
            <ImageIcon size={16} />
            {loadingPhoto ? "Carregando..." : "Da galeria"}
          </button>
        </div>
      )}

      {photoError && <p className="max-w-xs text-center text-xs text-orange">{photoError}</p>}

      <div className="flex w-full max-w-xs gap-3">
        {shareSupported && (
          <Button onClick={handleShare} disabled={!ready} className="flex flex-1 items-center justify-center gap-2">
            <Share2 size={18} />
            Compartilhar
          </Button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!ready}
          className={`flex items-center justify-center gap-2 rounded-lg border border-lightblue/50 px-4 py-2.5 text-sm font-medium text-navy hover:bg-lightblue/10 disabled:opacity-50 ${
            shareSupported ? "" : "flex-1"
          }`}
        >
          <Download size={18} />
          Baixar imagem
        </button>
      </div>
    </div>
  );
}
