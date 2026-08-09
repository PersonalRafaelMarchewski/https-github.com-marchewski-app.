export type EmbedInfo = { type: "youtube" | "video" | "other"; src: string };

// Reconhece link do YouTube (várias formas) ou arquivo de vídeo direto
// (upload nosso ou link .mp4/.webm/etc) pra saber como embutir.
export function toEmbedInfo(url: string): EmbedInfo {
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

    // upload nosso (Supabase Storage) não tem extensão no path sempre óbvia
    // mas vem do nosso bucket público — trata como vídeo direto também
    if (host.endsWith("supabase.co") && u.pathname.includes("/storage/")) {
      return { type: "video", src: url };
    }

    return { type: "other", src: url };
  } catch {
    return { type: "other", src: url };
  }
}
