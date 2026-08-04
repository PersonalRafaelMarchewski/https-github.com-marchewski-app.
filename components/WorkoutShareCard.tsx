"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Camera, X } from "lucide-react";
import Button from "@/components/Button";
import { compressImage } from "@/lib/image";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Cores da marca (ver tailwind.config.ts)
const NAVY = "#1F2556";
const NAVY_DEEP = "#141833";
const BLUE = "#8499CC";
const ORANGE = "#ED5B35";

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Desenha a imagem preenchendo todo o retângulo (equivalente a background-size: cover),
// cortando o excedente pra manter a proporção sem distorcer.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = imgW / imgH;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = imgW, sh = imgH;

  if (imgRatio > boxRatio) {
    sw = imgH * boxRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / boxRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

export default function WorkoutShareCard({
  studentName,
  workoutName,
  label,
  exerciseCount,
  durationMinutes,
  dateIso,
}: {
  studentName: string;
  workoutName: string;
  label: string;
  exerciseCount: number;
  durationMinutes: number | null;
  dateIso: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        // foto do aluno como fundo, cobrindo o card inteiro
        drawCover(ctx, bgPhoto, bgPhoto.width, bgPhoto.height, 0, 0, CANVAS_W, CANVAS_H);

        // camada escura por cima pra manter o texto legível — mais forte
        // nas pontas (onde ficam logo e rodapé) e mais leve no meio
        const scrim = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        scrim.addColorStop(0, "rgba(20,24,51,0.72)");
        scrim.addColorStop(0.28, "rgba(20,24,51,0.42)");
        scrim.addColorStop(0.62, "rgba(20,24,51,0.5)");
        scrim.addColorStop(1, "rgba(20,24,51,0.8)");
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else {
        // fundo padrão em degradê
        const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        bg.addColorStop(0, NAVY);
        bg.addColorStop(1, NAVY_DEEP);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // brilho suave laranja atrás do badge
        const glow = ctx.createRadialGradient(CANVAS_W / 2, 760, 40, CANVAS_W / 2, 760, 420);
        glow.addColorStop(0, "rgba(237,91,53,0.35)");
        glow.addColorStop(1, "rgba(237,91,53,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
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
      ctx.fillText("T R E I N O   C O N C L U Í D O", CANVAS_W / 2, 420);

      // badge circular com o label do treino
      const badgeY = 620;
      const badgeR = 110;
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.font = "800 110px Poppins, Arial";
      ctx.textBaseline = "middle";
      ctx.fillText(label, CANVAS_W / 2, badgeY + 8);
      ctx.textBaseline = "alphabetic";

      // nome do treino
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 56px Arial";
      wrapCenteredText(ctx, workoutName, CANVAS_W / 2, 830, 900, 64);

      // duração — estatística principal
      const heroY = 1080;
      if (durationMinutes) {
        ctx.fillStyle = ORANGE;
        ctx.font = "800 260px Arial";
        ctx.fillText(String(durationMinutes), CANVAS_W / 2, heroY);
        ctx.fillStyle = bgPhoto ? "#ffffff" : BLUE;
        ctx.font = "600 46px Arial";
        ctx.fillText("MINUTOS DE TREINO", CANVAS_W / 2, heroY + 70);
      } else {
        ctx.fillStyle = ORANGE;
        ctx.font = "800 90px Arial";
        ctx.fillText("Treino", CANVAS_W / 2, heroY - 40);
        ctx.fillText("concluído", CANVAS_W / 2, heroY + 60);
      }

      // linha de estatísticas
      const statsY = 1300;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "600 42px Arial";
      ctx.fillText(
        `${exerciseCount} exercício${exerciseCount === 1 ? "" : "s"} · ${formatDate(dateIso)}`,
        CANVAS_W / 2,
        statsY
      );

      // divisor
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 160, statsY + 70);
      ctx.lineTo(CANVAS_W / 2 + 160, statsY + 70);
      ctx.stroke();

      // nome do aluno
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 48px Arial";
      ctx.fillText(studentName, CANVAS_W / 2, statsY + 150);

      // rodapé
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "500 32px Arial";
      ctx.fillText("Marchewski Assessoria Esportiva", CANVAS_W / 2, CANVAS_H - 90);

      if (!cancelled) setReady(true);
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [studentName, workoutName, label, exerciseCount, durationMinutes, dateIso, bgPhoto]);

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
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loadingPhoto}
          className="flex items-center gap-1.5 text-sm font-medium text-orange hover:underline disabled:opacity-50"
        >
          <Camera size={16} />
          {loadingPhoto ? "Carregando foto..." : "Usar foto como fundo"}
        </button>
      )}

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
