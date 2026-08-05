"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Camera, Image as ImageIcon, X } from "lucide-react";
import Button from "@/components/Button";
import { compressImage } from "@/lib/image";
import {
  BLUE,
  ORANGE,
  loadImage,
  loadImageFromFile,
  drawDefaultBackground,
  drawPhotoBackground,
} from "@/lib/shareCardUtils";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const MONTH_NAMES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

export default function MonthlyProgressShareCard({
  studentName,
  monthIndex,
  year,
  workoutsCount,
  streak,
  beforeWeight,
  afterWeight,
}: {
  studentName: string;
  monthIndex: number; // 0-11
  year: number;
  workoutsCount: number;
  streak: number;
  beforeWeight: number | null;
  afterWeight: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [bgPhoto, setBgPhoto] = useState<HTMLImageElement | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

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
        drawDefaultBackground(ctx, CANVAS_W, CANVAS_H, 900);
      }

      const logo = await loadImage("/logo-negativo.png");
      if (!cancelled && logo) {
        const logoW = 260;
        const logoH = logoW * (logo.height / logo.width);
        ctx.drawImage(logo, (CANVAS_W - logoW) / 2, 140, logoW, logoH);
      }
      if (cancelled) return;

      ctx.textAlign = "center";

      // eyebrow
      ctx.fillStyle = ORANGE;
      ctx.font = "700 34px Arial";
      ctx.fillText(`R E S U M O   D E   ${MONTH_NAMES[monthIndex]}`, CANVAS_W / 2, 420);

      // hero: treinos no mês
      const heroY = 640;
      ctx.fillStyle = ORANGE;
      ctx.font = "800 300px Arial";
      ctx.fillText(String(workoutsCount), CANVAS_W / 2, heroY);
      ctx.fillStyle = bgPhoto ? "#ffffff" : BLUE;
      ctx.font = "600 44px Arial";
      ctx.fillText(
        workoutsCount === 1 ? "TREINO CONCLUÍDO NO MÊS" : "TREINOS CONCLUÍDOS NO MÊS",
        CANVAS_W / 2,
        heroY + 80
      );

      const divider1Y = heroY + 160;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 160, divider1Y);
      ctx.lineTo(CANVAS_W / 2 + 160, divider1Y);
      ctx.stroke();

      let cursorY = divider1Y + 110;

      if (beforeWeight != null && afterWeight != null) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "600 36px Arial";
        ctx.fillText("PESO NO MÊS", CANVAS_W / 2, cursorY);

        cursorY += 80;
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 60px Arial";
        ctx.fillText(
          `${beforeWeight.toFixed(1)}kg  →  ${afterWeight.toFixed(1)}kg`,
          CANVAS_W / 2,
          cursorY
        );

        cursorY += 62;
        const delta = afterWeight - beforeWeight;
        const deltaText =
          Math.abs(delta) < 0.05 ? "estável" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`;
        ctx.fillStyle = ORANGE;
        ctx.font = "700 40px Arial";
        ctx.fillText(deltaText, CANVAS_W / 2, cursorY);

        cursorY += 100;
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 36px Arial";
      ctx.fillText("SEQUÊNCIA ATUAL", CANVAS_W / 2, cursorY);

      cursorY += 76;
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 60px Arial";
      ctx.fillText(
        streak === 1 ? "1 dia treinando" : `${streak} dias treinando`,
        CANVAS_W / 2,
        cursorY
      );

      const divider2Y = cursorY + 70;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 160, divider2Y);
      ctx.lineTo(CANVAS_W / 2 + 160, divider2Y);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 48px Arial";
      ctx.fillText(studentName, CANVAS_W / 2, divider2Y + 80);

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "500 32px Arial";
      ctx.fillText("Marchewski Assessoria Esportiva", CANVAS_W / 2, CANVAS_H - 90);

      if (!cancelled) setReady(true);
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [studentName, monthIndex, year, workoutsCount, streak, beforeWeight, afterWeight, bgPhoto]);

  async function handlePhotoSelected(file: File | null) {
    if (!file) return;
    setLoadingPhoto(true);
    try {
      const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.85 });
      const img = await loadImageFromFile(compressed);
      setBgPhoto(img);
    } finally {
      setLoadingPhoto(false);
    }
  }

  async function getBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  function fileName() {
    return `resumo-${year}-${String(monthIndex + 1).padStart(2, "0")}.png`;
  }

  async function handleDownload() {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Meu resumo do mês!",
          text: "Mais um mês de treino 💪",
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

      <div className="flex w-full max-w-xs gap-3">
        {shareSupported && (
          <Button
            onClick={handleShare}
            disabled={!ready}
            className="flex flex-1 items-center justify-center gap-2"
          >
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
