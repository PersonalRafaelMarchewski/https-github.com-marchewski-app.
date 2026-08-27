import Link from "next/link";
import { ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import { todayInBrazil } from "@/lib/date";

// Aba "Presenças": todos os alunos ativos, separados em Personal e
// Assessoria, com o resumo do mês — presenças (✓), faltas (✗), aulas que
// já passaram sem registro e as ainda por vir. Alimentada pelos botões
// Presente/Falta dentro de cada aula da agenda.
export default async function PresencasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  // mês exibido: ?mes=YYYY-MM, senão o atual (no fuso do Brasil)
  const hoje = todayInBrazil();
  const mesAtivo = /^\d{4}-\d{2}$/.test(mes ?? "") ? (mes as string) : hoje.slice(0, 7);
  const [ano, mesNum] = mesAtivo.split("-").map(Number);
  const inicioMes = `${mesAtivo}-01T00:00:00-03:00`;
  const proximoMes = mesNum === 12 ? `${ano + 1}-01` : `${ano}-${String(mesNum + 1).padStart(2, "0")}`;
  const mesAnterior = mesNum === 1 ? `${ano - 1}-12` : `${ano}-${String(mesNum - 1).padStart(2, "0")}`;
  const fimMes = `${proximoMes}-01T00:00:00-03:00`;

  const nomeMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${mesAtivo}-15T12:00:00-03:00`));

  const [{ data: students }, { data: sessions }] = await Promise.all([
    supabase
      .from("students")
      .select("id, service_type, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase
      .from("training_sessions")
      .select("student_id, start_at, status")
      .eq("trainer_id", user!.id)
      .not("student_id", "is", null)
      .gte("start_at", inicioMes)
      .lt("start_at", fimMes)
      .order("start_at", { ascending: true })
      .limit(2000),
  ]);

  const agoraIso = new Date().toISOString();

  type Resumo = { presencas: number; faltas: number; semRegistro: number; futuras: number };
  const porAluno = new Map<string, Resumo>();
  for (const s of (sessions ?? []) as any[]) {
    if (s.status === "canceled") continue;
    const r = porAluno.get(s.student_id) ?? { presencas: 0, faltas: 0, semRegistro: 0, futuras: 0 };
    if (s.status === "done") r.presencas++;
    else if (s.status === "missed") r.faltas++;
    else if (s.start_at < agoraIso) r.semRegistro++;
    else r.futuras++;
    porAluno.set(s.student_id, r);
  }

  type Row = {
    id: string;
    name: string;
    serviceType: "personal" | "assessoria";
    resumo: Resumo;
    total: number;
  };

  const rows: Row[] = (students ?? []).map((s: any) => {
    const resumo = porAluno.get(s.id) ?? { presencas: 0, faltas: 0, semRegistro: 0, futuras: 0 };
    return {
      id: s.id,
      name: s.profiles?.name ?? "Aluno",
      serviceType: s.service_type === "personal" ? "personal" : "assessoria",
      resumo,
      total: resumo.presencas + resumo.faltas + resumo.semRegistro + resumo.futuras,
    };
  });

  const groups = (["personal", "assessoria"] as const).map((tipo) => ({
    tipo,
    label: tipo === "personal" ? "Personal" : "Assessoria",
    list: rows
      .filter((r) => r.serviceType === tipo && r.total > 0)
      .sort((a, b) => b.resumo.faltas - a.resumo.faltas || a.name.localeCompare(b.name)),
    semAula: rows.filter((r) => r.serviceType === tipo && r.total === 0).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCheck size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Presenças</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/presencas?mes=${mesAnterior}`}
          aria-label="Mês anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-lightblue/50 text-navy hover:bg-lightblue/10"
        >
          <ChevronLeft size={16} />
        </Link>
        <span className="min-w-40 text-center font-heading font-semibold capitalize text-navy">
          {nomeMes}
        </span>
        <Link
          href={`/presencas?mes=${proximoMes}`}
          aria-label="Próximo mês"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-lightblue/50 text-navy hover:bg-lightblue/10"
        >
          <ChevronRight size={16} />
        </Link>
      </div>

      <p className="-mt-2 text-sm text-blue">
        Marque presença ou falta dentro de cada aula na agenda — aqui é o somatório do mês. Quem tem
        mais faltas aparece primeiro. "Sem registro" são aulas que já passaram e ainda não foram
        marcadas.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.tipo}>
            <h2 className="mb-3 font-heading font-semibold text-navy">
              {g.label}{" "}
              <span className="font-body text-xs font-normal text-blue">
                — {g.list.length} com aula no mês
                {g.semAula > 0 ? ` · ${g.semAula} sem aula` : ""}
              </span>
            </h2>
            {g.list.length === 0 ? (
              <Card className="text-blue">Nenhuma aula nesse grupo neste mês.</Card>
            ) : (
              <div className="space-y-2">
                {g.list.map((r) => (
                  <Card
                    key={r.id}
                    className={`!py-3 ${r.resumo.faltas > 0 ? "border-l-4 border-l-[#B3261E]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/alunos/${r.id}`}
                        className="min-w-0 truncate font-medium text-navy hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="flex-none text-xs text-blue">{r.total} aula{r.total > 1 ? "s" : ""} no mês</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#0b8043]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#0b8043]">
                        ✓ {r.resumo.presencas} presença{r.resumo.presencas === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          r.resumo.faltas > 0 ? "bg-[#B3261E]/12 text-[#B3261E]" : "bg-lightblue/15 text-blue"
                        }`}
                      >
                        ✗ {r.resumo.faltas} falta{r.resumo.faltas === 1 ? "" : "s"}
                      </span>
                      {r.resumo.semRegistro > 0 && (
                        <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                          {r.resumo.semRegistro} sem registro
                        </span>
                      )}
                      {r.resumo.futuras > 0 && (
                        <span className="rounded-full bg-lightblue/15 px-2.5 py-0.5 text-[11px] font-medium text-blue">
                          {r.resumo.futuras} por vir
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
