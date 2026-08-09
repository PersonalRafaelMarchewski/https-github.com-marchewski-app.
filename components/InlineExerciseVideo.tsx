"use client";

import { toEmbedInfo } from "@/lib/videoEmbed";

// Vídeo já embutido e visível na hora — sem precisar clicar em nada pra
// "abrir" primeiro (pedido do Rafa: igual MFIT/Personal Fit mostram).
export default function InlineExerciseVideo({ videoUrl }: { videoUrl: string }) {
  const embed = toEmbedInfo(videoUrl);

  return (
    <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black">
      {embed.type === "video" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={embed.src} controls playsInline preload="metadata" className="h-full w-full" />
      ) : embed.type === "youtube" ? (
        <iframe
          src={embed.src}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-medium text-orange hover:underline"
        >
          Abrir vídeo em outra aba
        </a>
      )}
    </div>
  );
}
