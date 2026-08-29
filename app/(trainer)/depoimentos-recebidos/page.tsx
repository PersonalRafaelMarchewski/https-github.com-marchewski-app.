import Link from "next/link";
import { Quote, Star, ShieldCheck, ShieldOff } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import CopyTextButton from "@/components/CopyTextButton";
import { deleteTestimonial } from "./actions";

// Aba "Depoimentos": tudo que os alunos enviaram pela aba "Depoimento" do
// app deles — nota, tempo de treino, texto e se autorizaram divulgar.
// Copiar o texto já sai pronto pra postar (com o primeiro nome, quando
// autorizado).
export default async function DepoimentosPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: rows, error } = await supabase
    .from("testimonials")
    .select("id, display_name, training_time, rating, body, authorized, created_at, students:student_id (id, profiles:profile_id (name))")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const semTabela = Boolean(error);
  const list = (rows ?? []) as any[];
  const autorizados = list.filter((r) => r.authorized).length;
  const media = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  const fmtData = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(
      new Date(iso)
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Quote size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Depoimentos</h1>
      </div>
      <p className="-mt-4 text-sm text-blue">
        Os alunos enviam pela página <strong>/depoimentos</strong> (o link tá em Minha conta) — chega no seu WhatsApp e fica registrado aqui. Quem marcou a
        autorização pode ser divulgado no site e nas redes com o primeiro nome.
      </p>

      {semTabela ? (
        <Card className="text-orange">
          Falta rodar a migração <code>migration-depoimentos.sql</code> no Supabase pra ativar os
          depoimentos.
        </Card>
      ) : list.length === 0 ? (
        <Card className="text-blue">
          Nenhum depoimento ainda. Manda o link pros alunos — tá em <strong>Minha conta</strong>.
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-lightblue/15 px-3 py-1 font-semibold text-navy">
              {list.length} depoimento{list.length > 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-[#E8A81C]/15 px-3 py-1 font-semibold text-[#8a6410]">
              ★ média {media.toFixed(1)}
            </span>
            <span className="rounded-full bg-[#0b8043]/12 px-3 py-1 font-semibold text-[#0b8043]">
              {autorizados} autorizado{autorizados === 1 ? "" : "s"} pra divulgar
            </span>
          </div>

          <div className="space-y-3">
            {list.map((r) => {
              const nomeCompleto = r.students?.profiles?.name ?? null;
              const textoPost = `"${r.body}"\n— ${r.display_name.split(" ")[0]}${r.training_time ? `, ${r.training_time.toLowerCase()} de treino` : ""}`;
              return (
                <Card key={r.id} className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-navy">
                        {r.display_name}
                        {nomeCompleto && nomeCompleto !== r.display_name && (
                          <span className="text-xs font-normal text-blue"> · {nomeCompleto}</span>
                        )}
                      </p>
                      <p className="text-xs text-blue">
                        {fmtData(r.created_at)}
                        {r.training_time ? ` · ${r.training_time}` : ""}
                        {r.students?.id && (
                          <>
                            {" · "}
                            <Link href={`/alunos/${r.students.id}`} className="hover:underline">
                              abrir aluno
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5" aria-label={`${r.rating} de 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={16}
                          className={n <= r.rating ? "text-[#E8A81C]" : "text-lightblue/50"}
                          fill={n <= r.rating ? "#E8A81C" : "none"}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-navy">"{r.body}"</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {r.authorized ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0b8043]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#0b8043]">
                        <ShieldCheck size={12} /> autorizou divulgar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lightblue/15 px-2.5 py-0.5 text-[11px] font-medium text-blue">
                        <ShieldOff size={12} /> só pra você (não divulgar)
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <CopyTextButton text={textoPost} label="Copiar pra postar" />
                      <DeleteButton
                        action={deleteTestimonial.bind(null, r.id)}
                        confirmMessage="Apagar esse depoimento? Não dá pra desfazer."
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
