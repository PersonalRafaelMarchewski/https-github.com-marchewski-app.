"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

type EmbedInfo = { type: "youtube" | "video" | "other"; src: string };

function toEmbedInfo(url: string): EmbedInfo {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { type: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return { type: "youtube", src: `https://www.youtube.com/embed/${id}` };
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) return { type: "youtube", src: `https://www.youtube.com/embed/${id}` };
      }
      if (u.pathname.startsWith("/embed/")) {
        return { type: "youtube", src: url };
      }
    }

    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) {
      return { type: "video", src: url };
    }

    return { type: "other", src: url };
  } catch {
    return { type: "other", src: url };
  }
}

export default function ExerciseVideoButton({ videoUrl }: { videoUrl: string }) {
  const [open, setOpen] = useState(false);
  const embed = toEmbedInfo(videoUrl);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-fit items-center gap-1.5 text-sm font-medium text-orange hover:underline"
      >
        <Play size={14} />
        Ver vídeo do exercício
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar vídeo"
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <X size={18} />
            </button>

            <div className="aspect-video w-full">
              {embed.type === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={embed.src} controls autoPlay className="h-full w-full" />
              ) : embed.type === "youtube" ? (
                <iframe
                  src={`${embed.src}?autoplay=1`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center text-white">
                  <p className="text-sm">Não consegui abrir o vídeo aqui dentro.</p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-orange hover:underline"
                  >
                    Abrir em outra aba
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
