"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Camera, Image as ImageIcon, X, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
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

type OverlayLayout = { xPct: number; yPct: number; scale: number };

// Posições padrão — reproduzem o layout original (título/estatísticas lá em
// cima, marca+selo no rodapé). O aluno pode arrastar e redimensionar a
// partir daqui; "yPct" é o centro do bloco, não o topo.
const DEFAULT_TITLE_LAYOUT: OverlayLayout = { xPct: 50, yPct: (369 / CANVAS_H) * 100, scale: 1 };
const DEFAULT_BADGE_LAYOUT: OverlayLayout = { xPct: 50, yPct: ((1700 - 136) / CANVAS_H) * 100, scale: 1 };

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Bloco arrastável (título ou marca) — o aluno posiciona com o dedo e ajusta
// o tamanho pelos botões de +/-, sem precisar de gesto de pinça.
function DraggableOverlay({
  layout,
  onChange,
  defaultLayout,
  containerRef,
  onDelete,
  children,
}: {
  layout: OverlayLayout;
  onChange: (next: OverlayLayout) => void;
  defaultLayout: OverlayLayout;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const dragRef = useRef<{ startX: number; startY: number; start: OverlayLayout } | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, start: layout };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    onChange({
      ...dragRef.current.start,
      xPct: clamp(dragRef.current.start.xPct + dxPct, 8, 92),
      yPct: clamp(dragRef.current.start.yPct + dyPct, 6, 94),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function adjustScale(delta: number) {
    onChange({ ...layout, scale: clamp(+(layout.scale + delta).toFixed(2), MIN_SCALE, MAX_SCALE) });
  }

  return (
    <div
      className="absolute"
      style={{ left: `${layout.xPct}%`, top: `${layout.yPct}%`, transform: "translate(-50%, -50%)" }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="cursor-grab touch-none select-none active:cursor-grabbing"
        style={{ transform: `scale(${layout.scale})` }}
      >
        {children}
      </div>

      <div className="absolute left-1/2 top-full mt-2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-navy/85 px-1.5 py-1 shadow-md backdrop-blur">
        <button
          type="button"
          onClick={() => adjustScale(-0.1)}
          aria-label="Diminuir"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white active:bg-white/15"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={() => onChange(defaultLayout)}
          aria-label="Redefinir posição"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white active:bg-white/15"
        >
          <RotateCcw size={12} />
        </button>
        <button
          type="button"
          onClick={() => adjustScale(0.1)}
          aria-label="Aumentar"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white active:bg-white/15"
        >
          <Plus size={13} />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remover bloco"
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/80 active:bg-white/15"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function WorkoutShareCard({
  exerciseCount = 0,
  totalKg,
  dateIso,
  freeMode = false,
}: {
  exerciseCount?: number;
  totalKg?: number | null;
  dateIso: string;
  // Modo livre (aba "Foto" do aluno): mesma montagem, mas sem estatísticas
  // de treino — o bloco de texto vira uma frase que o aluno escreve (e
  // começa oculto, pra postagem limpa só com a foto + marca). Nada é
  // registrado nem notificado: é só a foto com a marca.
  freeMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [bgPhoto, setBgPhoto] = useState<HTMLImageElement | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [titleLayout, setTitleLayout] = useState<OverlayLayout>(DEFAULT_TITLE_LAYOUT);
  const [badgeLayout, setBadgeLayout] = useState<OverlayLayout>(DEFAULT_BADGE_LAYOUT);
  // o bloco de título/estatísticas é opcional — o aluno pode tirar se quiser
  // um cartão mais limpo. A marca da assessoria embaixo não sai: fica sempre.
  const [titleVisible, setTitleVisible] = useState(!freeMode);
  // frase do modo livre (opcional) — o aluno escreve a dele
  const [customText, setCustomText] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setShareSupported(
      typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof navigator.canShare === "function"
    );
  }, []);

  // carrega a marca uma vez, de antemão — se deixasse pra carregar só na hora
  // de baixar/compartilhar, o atraso extra (rede + decode) podia estourar a
  // janela de "gesto do usuário" que o navegador exige pro download/share
  // funcionar, principalmente no Safari do iPhone
  useEffect(() => {
    let cancelled = false;
    loadImage("/logo-negativo.png").then((img) => {
      if (!cancelled) logoRef.current = img;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // o canvas visível desenha só o fundo (degradê ou foto) — título, estatísticas
  // e marca ficam por cima como blocos de HTML arrastáveis, e só são "gravados"
  // na imagem de verdade na hora de baixar/compartilhar
  useEffect(() => {
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

    setReady(true);
  }, [bgPhoto]);

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

  // desenha a imagem final (fundo + título + marca) num canvas separado,
  // usando a posição/tamanho que o aluno escolheu pra cada bloco
  async function renderExportCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d")!;

    if (bgPhoto) {
      drawPhotoBackground(ctx, bgPhoto, bgPhoto.width, bgPhoto.height, CANVAS_W, CANVAS_H);
    } else {
      drawDefaultBackground(ctx, CANVAS_W, CANVAS_H, 320);
    }

    ctx.textAlign = "center";

    // bloco de título + estatísticas — opcional, o aluno pode ter apagado
    if (titleVisible && freeMode) {
      // modo livre: só a frase do aluno (se escreveu), com sombra pra ler
      // sobre qualquer foto
      if (customText.trim()) {
        const ts = titleLayout.scale;
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${58 * ts}px Arial`;
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 16 * ts;
        ctx.fillText(
          customText.trim(),
          (titleLayout.xPct / 100) * CANVAS_W,
          (titleLayout.yPct / 100) * CANVAS_H
        );
        ctx.shadowBlur = 0;
      }
    } else if (titleVisible) {
      const ts = titleLayout.scale;
      const tCenterX = (titleLayout.xPct / 100) * CANVAS_W;
      const tCenterY = (titleLayout.yPct / 100) * CANVAS_H;

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${64 * ts}px Arial`;
      ctx.fillText("MAIS UM TREINO", tCenterX, tCenterY - 109 * ts);
      ctx.fillStyle = ORANGE;
      ctx.fillText("NA CONTA! 💪", tCenterX, tCenterY - 29 * ts);

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `600 ${42 * ts}px Arial`;
      const statsParts: string[] = [];
      statsParts.push(`${exerciseCount} exercício${exerciseCount === 1 ? "" : "s"}`);
      if (totalKg && totalKg > 0) statsParts.push(`${Math.round(totalKg)}kg movidos`);
      ctx.fillText(statsParts.join(" · "), tCenterX, tCenterY + 91 * ts);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2 * ts;
      ctx.beginPath();
      ctx.moveTo(tCenterX - 160 * ts, tCenterY + 161 * ts);
      ctx.lineTo(tCenterX + 160 * ts, tCenterY + 161 * ts);
      ctx.stroke();
    }

    // marca + selo "personal trainer"
    const bs = badgeLayout.scale;
    const bCenterX = (badgeLayout.xPct / 100) * CANVAS_W;
    const badgeCenterY = (badgeLayout.yPct / 100) * CANVAS_H + 136 * bs;

    const logo = logoRef.current ?? (await loadImage("/logo-negativo.png"));
    if (logo) {
      const logoW = 420 * bs;
      const logoH = logoW * (logo.height / logo.width);
      ctx.drawImage(logo, bCenterX - logoW / 2, badgeCenterY - logoH - 66 * bs, logoW, logoH);
    }

    const tag = "P E R S O N A L   T R A I N E R";
    ctx.font = `800 ${22 * bs}px Arial`;
    const tagPaddingX = 20 * bs;
    const tagW = ctx.measureText(tag).width + tagPaddingX * 2;
    const tagH = 40 * bs;
    const tagX = bCenterX - tagW / 2;
    const tagY = badgeCenterY - tagH / 2;
    const tagR = tagH / 2;
    ctx.beginPath();
    ctx.moveTo(tagX + tagR, tagY);
    ctx.arcTo(tagX + tagW, tagY, tagX + tagW, tagY + tagH, tagR);
    ctx.arcTo(tagX + tagW, tagY + tagH, tagX, tagY + tagH, tagR);
    ctx.arcTo(tagX, tagY + tagH, tagX, tagY, tagR);
    ctx.arcTo(tagX, tagY, tagX + tagW, tagY, tagR);
    ctx.closePath();
    // selo laranja sólido, mas mais fino/compacto que a versão original
    ctx.fillStyle = ORANGE;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, bCenterX, tagY + tagH / 2 + 2);
    ctx.textBaseline = "alphabetic";

    return canvas;
  }

  async function getBlob(): Promise<Blob | null> {
    const canvas = await renderExportCanvas();
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function handleDownload() {
    setExportError(null);
    const blob = await getBlob();
    if (!blob) {
      setExportError("Não conseguimos gerar a imagem agora. Tenta de novo.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = freeMode ? `marchewski-${dateIso}.png` : `treino-${dateIso}.png`;
    // precisa estar no documento pra alguns navegadores mobile aceitarem o
    // clique programático como download de verdade
    document.body.appendChild(a);
    a.click();
    a.remove();
    // revoga só depois de um tempinho — revogar na hora pode cortar o
    // download antes do navegador (principalmente no celular) terminar de
    // ler o arquivo, e a imagem chega corrompida/vazia
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function handleShare() {
    setExportError(null);
    const blob = await getBlob();
    if (!blob) {
      setExportError("Não conseguimos gerar a imagem agora. Tenta de novo.");
      return;
    }
    const file = new File([blob], freeMode ? `marchewski-${dateIso}.png` : `treino-${dateIso}.png`, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: freeMode ? "Marchewski Assessoria Esportiva" : "Treino concluído!",
          ...(freeMode ? {} : { text: "Mais um treino concluído 💪" }),
        });
        return;
      } catch {
        // usuário cancelou o compartilhamento — sem erro pro app
        return;
      }
    }
    handleDownload();
  }

  const statsText = [
    `${exerciseCount} exercício${exerciseCount === 1 ? "" : "s"}`,
    totalKg && totalKg > 0 ? `${Math.round(totalKg)}kg movidos` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="max-w-xs text-center text-xs text-blue">
        Arraste o título e a marca pra onde quiser, e ajuste o tamanho pelos botões de +/-.
      </p>

      <div
        ref={containerRef}
        className="relative w-full max-w-xs overflow-hidden rounded-2xl shadow-lg"
        style={{ containerType: "inline-size" }}
      >
        <canvas ref={canvasRef} className="block h-auto w-full" />

        {titleVisible && freeMode ? (
          <DraggableOverlay
            layout={titleLayout}
            onChange={setTitleLayout}
            defaultLayout={DEFAULT_TITLE_LAYOUT}
            containerRef={containerRef}
            onDelete={() => setTitleVisible(false)}
          >
            <p
              className="whitespace-nowrap text-center font-bold text-white"
              style={{ fontSize: "5.37cqw", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
            >
              {customText.trim() || "Sua frase aqui"}
            </p>
          </DraggableOverlay>
        ) : titleVisible ? (
          <DraggableOverlay
            layout={titleLayout}
            onChange={setTitleLayout}
            defaultLayout={DEFAULT_TITLE_LAYOUT}
            containerRef={containerRef}
            onDelete={() => setTitleVisible(false)}
          >
            <div className="flex flex-col items-center" style={{ width: "68cqw" }}>
              <p className="text-center font-bold text-white" style={{ fontSize: "5.93cqw", lineHeight: 1.15 }}>
                MAIS UM TREINO
              </p>
              <p className="text-center font-bold" style={{ fontSize: "5.93cqw", lineHeight: 1.15, color: ORANGE }}>
                NA CONTA! 💪
              </p>
              <p
                className="mt-3 text-center font-semibold"
                style={{ fontSize: "3.89cqw", color: "rgba(255,255,255,0.9)" }}
              >
                {statsText}
              </p>
              <div className="mt-4" style={{ width: "29.6cqw", height: 2, background: "rgba(255,255,255,0.25)" }} />
            </div>
          </DraggableOverlay>
        ) : (
          <button
            type="button"
            onClick={() => setTitleVisible(true)}
            className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-navy/85 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur"
          >
            {freeMode ? "+ Frase" : "+ Título"}
          </button>
        )}

        <DraggableOverlay layout={badgeLayout} onChange={setBadgeLayout} defaultLayout={DEFAULT_BADGE_LAYOUT} containerRef={containerRef}>
          <div className="flex flex-col items-center" style={{ width: "60cqw" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-negativo.png" alt="" style={{ width: "38.9cqw" }} />
            <div
              className="mt-2 rounded-full"
              style={{ padding: "0.65cqw 1.85cqw", background: ORANGE }}
            >
              <span
                className="whitespace-nowrap font-extrabold text-white"
                // espaço manual entre as letras em vez de letter-spacing: essa
                // propriedade também empurra espaço depois da ÚLTIMA letra,
                // o que deixava o texto puxado pra esquerda dentro do selo
                style={{ fontSize: "2.04cqw" }}
              >
                P E R S O N A L{"   "}T R A I N E R
              </span>
            </div>
          </div>
        </DraggableOverlay>
      </div>

      {freeMode && titleVisible && (
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value.slice(0, 40))}
          placeholder="Escreva sua frase (opcional)"
          className="w-full max-w-xs rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      )}

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
      {exportError && <p className="max-w-xs text-center text-xs text-orange">{exportError}</p>}

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
