import Link from "next/link";
import { FileBarChart, ArrowLeft } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import { todayInBrazil } from "@/lib/date";

// Relatório de balanço por aluno num período (meses): contratado x marcado
// x feito, com o saldo (superávit/déficit) — pra fechar as contas antes das
// férias de dezembro. Regra do saldo: o que CONTA contra o contrato é
// feita + sem registro + por vir + falta SEM reposição (falta consumida);
// falta COM direito a reposição não conta (vai ser reposta).
export default async function RelatorioAulasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { de, ate } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  const hoje = todayInBrazil();
  const anoAtual = hoje.slice(0, 4);
  const mesDe = /^\d{4}-\d{2}$/.test(de ?? "") ? (de as string) : `${anoAtual}-01`;
  const mesAte = /^\d{4}-\d{2}$/.test(ate ?? "") ? (ate as string) : `${anoAtual}-12`;

  // meses do período (inclusivo)
  const meses: string[] = [];
  {
    let [y, m] = mesDe.split("-").map(Number);
    const [ya, ma] = mesAte.split("-").map(Number);
    while (y < ya || (y === ya && m <= ma)) {
      meses.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }
  const inicio = `${mesDe}-01T00:00:00-03:00`;
  const [yFim, mFim] = mesAte.split("-").map(Number);
  const fimExcl = mFim === 12 ? `${yFim + 1}-01-01T00:00:00-03:00` : `${yFim}-${String(mFim + 1).padStart(2, "0")}-01T00:00:00-03:00`;

  const { data: students } = await supabase
    .from("students")
    .select("*, profiles:profile_id (name)")
    .eq("trainer_id", user!.id)
    .eq("status", "active");

  // pagina todas as sessões do período (sem teto de 1000)
  let sessions: any[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase
      .from("training_sessions")
      .select("student_id, start_at, status, missed_makeup")
      .eq("trainer_id", user!.id)
      .not("student_id", "is", null)
      .gte("start_at", inicio)
      .lt("start_at", fimExcl)
      .order("start_at")
      .range(page * 1000, page * 1000 + 999);
    if (error) break;
    sessions = sessions.concat(data ?? []);
    if (!data || data.length < 1000) break;
  }

  const agoraIso = new Date().toISOString();
  type MesInfo = { feitas: number; faltas: number; faltasRepor: number; semRegistro: number; porVir: number };
  const porAlunoMes = new Map<string, Map<string, MesInfo>>();
  for (const s of sessions) {
    if (s.status === "canceled") continue;
    const mes = new Date(new Date(s.start_at).getTime() - 3 * 3600_000).toISOString().slice(0, 7);
    if (!porAlunoMes.has(s.student_id)) porAlunoMes.set(s.student_id, new Map());
    const m = porAlunoMes.get(s.student_id)!;
    if (!m.has(mes)) m.set(mes, { feitas: 0, faltas: 0, faltasRepor: 0, semRegistro: 0, porVir: 0 });
    const info = m.get(mes)!;
    if (s.status === "done") info.feitas++;
    else if (s.status === "missed") {
      info.faltas++;
      if (s.missed_makeup === true) info.faltasRepor++;
    } else if (s.start_at < agoraIso) info.semRegistro++;
    else info.porVir++;
  }

  type Linha = {
    id: string;
    name: string;
    contratadoSemana: number | null;
    contratadoTotal: number | null;
    feitas: number;
    faltas: number;
    faltasRepor: number;
    semRegistro: number;
    porVir: number;
    marcadas: number;
    contam: number;
    saldo: number | null;
    porMes: { mes: string; info: MesInfo }[];
  };

  const linhas: Linha[] = (students ?? [])
    .map((st: any) => {
      const porMes = porAlunoMes.get(st.id) ?? new Map<string, MesInfo>();
      const tot = { feitas: 0, faltas: 0, faltasRepor: 0, semRegistro: 0, porVir: 0 };
      for (const info of porMes.values()) {
        tot.feitas += info.feitas;
        tot.faltas += info.faltas;
        tot.faltasRepor += info.faltasRepor;
        tot.semRegistro += info.semRegistro;
        tot.porVir += info.porVir;
      }
      const marcadas = tot.feitas + tot.faltas + tot.semRegistro + tot.porVir;
      const semanal = st.contracted_weekly_sessions ?? null;
      const contratadoTotal = semanal ? semanal * 4 * meses.length : null;
      // conta contra o contrato: feitas + sem registro + por vir + faltas
      // SEM direito a reposição (as com direito serão repostas)
      const contam = tot.feitas + tot.semRegistro + tot.porVir + (tot.faltas - tot.faltasRepor);
      return {
        id: st.id,
        name: st.profiles?.name ?? "Aluno",
        contratadoSemana: semanal,
        contratadoTotal,
        ...tot,
        marcadas,
        contam,
        saldo: contratadoTotal != null ? contam - contratadoTotal : null,
        porMes: [...porMes.entries()].sort().map(([mes, info]) => ({ mes, info })),
      };
    })
    .filter((l) => l.marcadas > 0 || l.contratadoTotal != null)
    .sort((a, b) => (a.saldo ?? 999) - (b.saldo ?? 999) || a.name.localeCompare(b.name));

  const fmtMes = (m: string) => {
    const [y, mm] = m.split("-");
    return `${mm}/${y.slice(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Relatório de aulas</h1>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/presencas/relatorio" method="get">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy">De</label>
          <input
            type="month"
            name="de"
            defaultValue={mesDe}
            className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy">Até</label>
          <input
            type="month"
            name="ate"
            defaultValue={mesAte}
            className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-blue"
        >
          Atualizar
        </button>
      </form>

      <p className="-mt-2 text-sm text-blue">
        {meses.length} {meses.length === 1 ? "mês" : "meses"} ({fmtMes(mesDe)} a {fmtMes(mesAte)}).
        Contratado = aulas/semana × 4 × meses. No saldo, falta <strong>com</strong> direito a
        reposição não conta contra o contrato (será reposta); falta sem reposição conta como aula
        consumida. Déficit aparece primeiro — é quem você deve aula.
      </p>

      <div className="space-y-2">
        {linhas.map((l) => (
          <Card key={l.id} className="!py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/alunos/${l.id}`} className="min-w-0 truncate font-medium text-navy hover:underline">
                {l.name}
              </Link>
              {l.saldo != null ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    l.saldo < 0 ? "bg-[#B3261E]/12 text-[#B3261E]" : "bg-[#0b8043]/12 text-[#0b8043]"
                  }`}
                >
                  {l.saldo < 0 ? `déficit ${l.saldo}` : l.saldo > 0 ? `superávit +${l.saldo}` : "em dia"}
                </span>
              ) : (
                <span className="rounded-full bg-lightblue/15 px-3 py-1 text-xs font-medium text-blue">
                  sem contrato definido
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              {l.contratadoTotal != null && (
                <span className="rounded-full bg-navy/8 px-2.5 py-0.5 font-semibold text-navy">
                  contratado {l.contratadoTotal} ({l.contratadoSemana}x/sem)
                </span>
              )}
              <span className="rounded-full bg-lightblue/15 px-2.5 py-0.5 font-medium text-blue">
                {l.marcadas} marcadas
              </span>
              <span className="rounded-full bg-[#0b8043]/12 px-2.5 py-0.5 font-semibold text-[#0b8043]">
                ✓ {l.feitas} feitas
              </span>
              <span className="rounded-full bg-[#B3261E]/12 px-2.5 py-0.5 font-semibold text-[#B3261E]">
                ✗ {l.faltas} faltas{l.faltasRepor > 0 ? ` (${l.faltasRepor} a repor)` : ""}
              </span>
              {l.semRegistro > 0 && (
                <span className="rounded-full bg-orange/15 px-2.5 py-0.5 font-semibold text-orange">
                  {l.semRegistro} sem registro
                </span>
              )}
              {l.porVir > 0 && (
                <span className="rounded-full bg-lightblue/15 px-2.5 py-0.5 font-medium text-blue">
                  {l.porVir} por vir
                </span>
              )}
            </div>
            {l.porMes.length > 0 && (
              <details className="mt-1.5 text-xs">
                <summary className="cursor-pointer font-medium text-blue">Mês a mês</summary>
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-[11px]">
                    <thead>
                      <tr className="text-blue">
                        <th className="py-1 pr-2 font-medium">Mês</th>
                        <th className="py-1 pr-2 font-medium">Feitas</th>
                        <th className="py-1 pr-2 font-medium">Faltas</th>
                        <th className="py-1 pr-2 font-medium">A repor</th>
                        <th className="py-1 pr-2 font-medium">Sem registro</th>
                        <th className="py-1 pr-2 font-medium">Por vir</th>
                        <th className="py-1 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-navy">
                      {l.porMes.map(({ mes, info }) => (
                        <tr key={mes} className="border-t border-lightblue/20">
                          <td className="py-1 pr-2 font-semibold">{fmtMes(mes)}</td>
                          <td className="py-1 pr-2">{info.feitas}</td>
                          <td className="py-1 pr-2">{info.faltas}</td>
                          <td className="py-1 pr-2">{info.faltasRepor}</td>
                          <td className="py-1 pr-2">{info.semRegistro}</td>
                          <td className="py-1 pr-2">{info.porVir}</td>
                          <td className="py-1 font-semibold">
                            {info.feitas + info.faltas + info.semRegistro + info.porVir}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>

      <Link href="/presencas" className="inline-flex items-center gap-1.5 text-sm text-blue hover:underline">
        <ArrowLeft size={14} />
        Voltar pra Presenças
      </Link>
    </div>
  );
}
