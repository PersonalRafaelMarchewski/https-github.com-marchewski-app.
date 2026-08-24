import { createClient } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import { Megaphone } from "lucide-react";

const KIND_LABELS: Record<string, string> = {
  treino: "Treino",
  dieta: "Dieta",
};

// Mural do aluno: os recados do personal endereçados a ele — gerais, do
// grupo dele (personal/assessoria) e os individuais, incluindo os avisos
// automáticos de treino/dieta atualizada. A RLS já filtra tudo — a query
// aqui é um select simples.
export default async function MuralAlunoPage() {
  const supabase = await createClient();

  let posts: any[] | null = null;
  {
    const { data } = await supabase
      .from("mural_posts")
      .select("id, kind, title, body, link_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    posts = data;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Mural</h1>

      {!posts || posts.length === 0 ? (
        <StudentCard className="text-blue">
          Nenhum recado por enquanto — quando seu personal publicar algo, aparece aqui.
        </StudentCard>
      ) : (
        posts.map((p) => (
          <StudentCard key={p.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Megaphone size={15} className="flex-none text-orange" />
              {KIND_LABELS[p.kind] && (
                <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                  {KIND_LABELS[p.kind]}
                </span>
              )}
              <span className="text-xs text-blue">
                {new Date(p.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  timeZone: "America/Sao_Paulo",
                })}
              </span>
            </div>
            {p.title && <p className="font-heading font-semibold text-navy">{p.title}</p>}
            <p className="whitespace-pre-wrap text-sm text-navy">{p.body}</p>
            {p.link_url && (
              <a
                href={p.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-orange hover:underline"
              >
                Abrir link ↗
              </a>
            )}
          </StudentCard>
        ))
      )}
    </div>
  );
}
