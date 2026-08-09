"use client";

// Compacta vídeo direto no navegador (ffmpeg.wasm) antes de subir — o plano
// gratuito do Supabase Storage tem um teto de 50MB por arquivo, e um vídeo
// gravado em qualidade alta do celular passa disso fácil. Os arquivos do
// ffmpeg-core (uns 30MB) ficam em /public/ffmpeg e só são baixados na hora
// que alguém realmente precisa comprimir algo — não pesa no carregamento
// normal do app.
import type { FFmpeg } from "@ffmpeg/ffmpeg";

// margem de segurança abaixo do teto real de 50MB do Supabase
const SAFE_LIMIT_BYTES = 45 * 1024 * 1024;

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        classWorkerURL: "/ffmpeg/worker.js",
        coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export function isCompressionSupported(): boolean {
  // precisa de WebAssembly e Web Worker — qualquer navegador dos últimos
  // anos tem os dois, mas melhor checar do que quebrar em algo mais antigo
  return typeof WebAssembly !== "undefined" && typeof Worker !== "undefined";
}

// tenta primeiro numa qualidade melhor (720p); se o vídeo for muito longo
// e ainda vier grande, tenta de novo mais agressivo (480p) antes de desistir
const PASSES: { scale: string; crf: string }[] = [
  { scale: "min(1280\\,iw):-2", crf: "28" },
  { scale: "min(854\\,iw):-2", crf: "32" },
];

/**
 * Compacta o vídeo se ele estiver acima do limite do Supabase. Arquivos já
 * pequenos voltam sem alteração (não vale a pena gastar tempo/bateria
 * comprimindo à toa).
 */
export async function compressVideoIfNeeded(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<File> {
  if (file.size <= SAFE_LIMIT_BYTES || !isCompressionSupported()) {
    return file;
  }

  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inExt = (file.name.split(".").pop() || "mp4").toLowerCase();
  const inputName = `input.${inExt}`;
  const outputName = "output.mp4";

  const handleProgress = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", handleProgress);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    let compressed: Blob | null = null;
    for (const pass of PASSES) {
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        `scale=${pass.scale}`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        pass.crf,
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-movflags",
        "+faststart",
        outputName,
      ]);
      const data = await ffmpeg.readFile(outputName);
      compressed = new Blob([data as BlobPart], { type: "video/mp4" });
      await ffmpeg.deleteFile(outputName);
      if (compressed.size <= SAFE_LIMIT_BYTES) break;
    }

    await ffmpeg.deleteFile(inputName);

    if (!compressed) return file;

    const compressedName = file.name.replace(/\.[^./]+$/, "") + "-compactado.mp4";
    return new File([compressed], compressedName, { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handleProgress);
  }
}
