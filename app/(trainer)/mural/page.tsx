import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import MuralComposer from "@/components/MuralComposer";
import DeleteButton from "@/components/DeleteButton";
import { deleteMuralPost } from "./actions";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Todos",
  personal: "Personal",
  assessoria: "Assessoria",
  student: "Individual",
};

const KIND_LABELS: Record<string, string> = {
  treino: "Treino",
  dieta: "Dieta",
};

// Mural do personal: publica recados (motivacional de segunda, post novo
// do blog, aviso geral) pro público que escolher, e vê o histórico do que
// já publicou — inclusive os avisos automáticos de treino/dieta alterada.
export default async function MuralPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: students } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active");

  const studentOptions = (students ?? [])
    .map((s: any) => ({ id: s.id, name: s.profiles?.name ?? "Aluno" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const nameByStudentId = new Map(studentOptions.map((s) => [s.id, s.name]));

  // pode não existir ainda (migração pendente) — mostra aviso em vez de quebrar
  let posts: any[] | null = null;
  let migrationPending = false;
  {
    const { data, error } = await supabase
      .from("mural_posts")
      .select("id, audience, student_id, kind, title, body, link_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) migrationPending = true;
    posts = data;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Mural</h1>

      {migrationPending ? (
        <Card className="text-blue">
          O mural ainda não foi ativado no banco — rode a migração{" "}
          <code className="rounded bg-lightblue/15 px-1">migration-mural.sql</code> no SQL Editor
          do Supabase e recarregue.
        </Card>
      ) : (
        <>
          <MuralComposer students={studentOptions} />

          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-navy">Publicados</h2>
            {!posts || posts.length === 0 ? (
              <Card className="text-blue">Nenhum recado publicado ainda.</Card>
            ) : (
              posts.map((p) => (
                <Card key={p.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {p.audience === "student"
                        ? (nameByStudentId.get(p.student_id) ?? "Individual")
                        : AUDIENCE_LABELS[p.audience]}
                    </span>
                    {KIND_LABELS[p.kind] && (
                      <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                        {KIND_LABELS[p.kind]}
                      </span>
                    )}
                    <span className="text-xs text-blue">
                      {new Date(p.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      })}
                    </span>
                    <span className="ml-auto">
                      <DeleteButton
                        action={deleteMuralPost.bind(null, p.id)}
                        confirmMessage="Apagar esse recado do mural? Ele some pros alunos também."
                      />
                    </span>
                  </div>
                  {p.title && <p className="font-heading font-semibold text-navy">{p.title}</p>}
                  <p className="whitespace-pre-wrap text-sm text-navy">{p.body}</p>
                  {p.link_url && (
                    <a
                      href={p.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-blue hover:underline"
                    >
                      Abrir link ↗
                    </a>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
