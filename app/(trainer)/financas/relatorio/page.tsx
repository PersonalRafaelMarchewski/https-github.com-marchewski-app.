import Link from "next/link";
import { FileBarChart, ArrowLeft, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import { todayInBrazil } from "@/lib/date";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Relatório financeiro por período (mesmo molde do relatório de aulas):
// receita ALUNO POR ALUNO (lançamentos manuais + Stripe), despesas por
// categoria, tudo com mês a mês expandível, e projeção anual pela média
// mensal do período.
export default async function RelatorioFinanceiroPage({
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
  const inicioDate = `${mesDe}-01`;
  const [yFim, mFim] = mesAte.split("-").map(Number);
  const fimExclDate = mFim === 12 ? `${yFim + 1}-01-01` : `${yFim}-${String(mFim + 1).padStart(2, "0")}-01`;

  const [entriesRes, paymentsRes, studentsRes] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("type, category, description, amount_cents, entry_date, student_id, business")
      .eq("trainer_id", user!.id)
      .gte("entry_date", inicioDate)
      .lt("entry_date", fimExclDate)
      .order("entry_date")
      .limit(5000),
    supabase
      .from("payments")
      .select("amount_cents, paid_at, status, student_id")
      .in("status", ["paid", "active"])
      .gte("paid_at", `${inicioDate}T00:00:00-03:00`)
      .lt("paid_at", `${fimExclDate}T00:00:00-03:00`)
      .order("paid_at")
      .limit(5000),
    supabase
      .from("students")
      .select("id, service_type, status, profiles:profile_id (name)")
      .eq("trainer_id", user!.id),
  ]);

  const entries = (entriesRes.data as any[]) ?? [];
  const payments = (paymentsRes.data as any[]) ?? [];
  const nomePorAluno = new Map(
    ((studentsRes.data as any[]) ?? []).map((s) => [
      s.id,
      { name: s.profiles?.name ?? "Aluno", tipo: s.service_type === "personal" ? "Personal" : "Assessoria", ativo: s.status === "active" },
    ])
  );

  // receita por aluno (e "Outras receitas" pros lançamentos sem aluno)
  type AlunoRec = { total: number; qtd: number; porMes: Map<string, number> };
  const receitaPorAluno = new Map<string, AlunoRec>();
  const addReceita = (key: string, mes: string, cents: number) => {
    if (!receitaPorAluno.has(key)) receitaPorAluno.set(key, { total: 0, qtd: 0, porMes: new Map() });
    const r = receitaPorAluno.get(key)!;
    r.total += cents;
    r.qtd += 1;
    r.porMes.set(mes, (r.porMes.get(mes) ?? 0) + cents);
  };

  let receitaTotal = 0;
  const receitaPorNegocio = { assessoria: 0, personal: 0 };
  for (const e of entries) {
    if (e.type !== "income") continue;
    const mes = String(e.entry_date).slice(0, 7);
    receitaTotal += e.amount_cents;
    if (e.business === "personal") receitaPorNegocio.personal += e.amount_cents;
    else receitaPorNegocio.assessoria += e.amount_cents;
    addReceita(e.student_id ?? "outras", mes, e.amount_cents);
  }
  for (const p of payments) {
    const mes = new Date(new Date(p.paid_at).getTime() - 3 * 3600_000).toISOString().slice(0, 7);
    receitaTotal += p.amount_cents;
    const tipo = p.student_id ? nomePorAluno.get(p.student_id)?.tipo : null;
    if (tipo === "Personal") receitaPorNegocio.personal += p.amount_cents;
    else receitaPorNegocio.assessoria += p.amount_cents;
    addReceita(p.student_id ?? "outras", mes, p.amount_cents);
  }

  // despesas por categoria
  type Cat = { total: number; porMes: Map<string, number> };
  const despesaPorCategoria = new Map<string, Cat>();
  let despesaTotal = 0;
  for (const e of entries) {
    if (e.type !== "expense") continue;
    const mes = String(e.entry_date).slice(0, 7);
    despesaTotal += e.amount_cents;
    const cat = e.category || "Sem categoria";
    if (!despesaPorCategoria.has(cat)) despesaPorCategoria.set(cat, { total: 0, porMes: new Map() });
    const c = despesaPorCategoria.get(cat)!;
    c.total += e.amount_cents;
    c.porMes.set(mes, (c.porMes.get(mes) ?? 0) + e.amount_cents);
  }

  const resultado = receitaTotal - despesaTotal;
  // projeção: média dos meses JÁ passados/correntes do período (mês sem
  // lançamento nenhum não conta pra não derrubar a média à toa)
  const mesesComMovimento = new Set<string>();
  for (const r of receitaPorAluno.values()) for (const m of r.porMes.keys()) mesesComMovimento.add(m);
  for (const c of despesaPorCategoria.values()) for (const m of c.porMes.keys()) mesesComMovimento.add(m);
  const nMeses = Math.max(1, mesesComMovimento.size);
  const mediaMensalReceita = Math.round(receitaTotal / nMeses);
  const projecaoAnualReceita = mediaMensalReceita * 12;

  const linhasReceita = [...receitaPorAluno.entries()]
    .map(([key, r]) => ({
      key,
      nome: key === "outras" ? "Outras receitas (sem aluno)" : (nomePorAluno.get(key)?.name ?? "Aluno removido"),
      tipo: key === "outras" ? null : (nomePorAluno.get(key)?.tipo ?? null),
      ...r,
    }))
    .sort((a, b) => b.total - a.total);

  const fmtMes = (m: string) => `${m.slice(5, 7)}/${m.slice(2, 4)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart size={24} className="flex-none text-orange" />
        <h1 className="text-2xl font-bold text-navy">Relatório financeiro</h1>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/financas/relatorio" method="get">
        <div>
          <label className="mb-1 block text-xs font-medium text-navy">De</label>
          <input type="month" name="de" defaultValue={mesDe} className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-navy">Até</label>
          <input type="month" name="ate" defaultValue={mesAte} className="rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange" />
        </div>
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-blue">
          Atualizar
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="!p-4">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-blue"><TrendingUp size={12} /> RECEITA</p>
          <p className="text-lg font-bold tracking-tight text-[#0b8043]">{brl(receitaTotal)}</p>
          <p className="mt-0.5 text-[11px] text-blue">
            Assessoria {brl(receitaPorNegocio.assessoria)} · Personal {brl(receitaPorNegocio.personal)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-blue"><TrendingDown size={12} /> DESPESAS</p>
          <p className="text-lg font-bold tracking-tight text-[#B3261E]">{brl(despesaTotal)}</p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-blue"><Wallet size={12} /> RESULTADO</p>
          <p className={`text-lg font-bold tracking-tight ${resultado >= 0 ? "text-[#0b8043]" : "text-[#B3261E]"}`}>{brl(resultado)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-[11px] font-semibold text-blue">PROJEÇÃO ANUAL</p>
          <p className="text-lg font-bold tracking-tight text-navy">{brl(projecaoAnualReceita)}</p>
          <p className="mt-0.5 text-[11px] text-blue">média {brl(mediaMensalReceita)}/mês × 12</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">
          Receita por aluno{" "}
          <span className="font-body text-xs font-normal text-blue">— {fmtMes(mesDe)} a {fmtMes(mesAte)}</span>
        </h2>
        {linhasReceita.length === 0 ? (
          <Card className="text-blue">Nenhuma receita lançada nesse período.</Card>
        ) : (
          <div className="space-y-2">
            {linhasReceita.map((l) => (
              <Card key={l.key} className="!py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    {l.key === "outras" ? (
                      <p className="truncate font-medium text-navy">{l.nome}</p>
                    ) : (
                      <Link href={`/alunos/${l.key}`} className="block truncate font-medium text-navy hover:underline">
                        {l.nome}
                      </Link>
                    )}
                    <p className="text-[11px] text-blue">
                      {l.tipo ? `${l.tipo} · ` : ""}
                      {l.qtd} pagamento{l.qtd === 1 ? "" : "s"} · média {brl(Math.round(l.total / Math.max(1, l.porMes.size)))}/mês
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0b8043]/12 px-3 py-1 text-sm font-bold text-[#0b8043]">
                    {brl(l.total)}
                  </span>
                </div>
                <details className="mt-1.5 text-xs">
                  <summary className="cursor-pointer font-medium text-blue">Mês a mês</summary>
                  <ul className="mt-1 space-y-0.5 pl-3 text-navy">
                    {[...l.porMes.entries()].sort().map(([mes, cents]) => (
                      <li key={mes}>
                        <strong>{fmtMes(mes)}</strong> — {brl(cents)}
                      </li>
                    ))}
                  </ul>
                </details>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-heading font-semibold text-navy">Despesas por categoria</h2>
        {despesaPorCategoria.size === 0 ? (
          <Card className="text-blue">Nenhuma despesa lançada nesse período.</Card>
        ) : (
          <div className="space-y-2">
            {[...despesaPorCategoria.entries()]
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cat, c]) => (
                <Card key={cat} className="!py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium text-navy">{cat}</p>
                    <span className="rounded-full bg-[#B3261E]/12 px-3 py-1 text-sm font-bold text-[#B3261E]">
                      {brl(c.total)}
                    </span>
                  </div>
                  <details className="mt-1.5 text-xs">
                    <summary className="cursor-pointer font-medium text-blue">Mês a mês</summary>
                    <ul className="mt-1 space-y-0.5 pl-3 text-navy">
                      {[...c.porMes.entries()].sort().map(([mes, cents]) => (
                        <li key={mes}>
                          <strong>{fmtMes(mes)}</strong> — {brl(cents)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </Card>
              ))}
          </div>
        )}
      </div>

      <Link href="/financas" className="inline-flex items-center gap-1.5 text-sm text-blue hover:underline">
        <ArrowLeft size={14} />
        Voltar pra Finanças
      </Link>
    </div>
  );
}
