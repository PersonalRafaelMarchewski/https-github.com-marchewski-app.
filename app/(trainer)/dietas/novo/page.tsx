import { createClient, getAuthUser } from "@/lib/supabase/server";
import { carregarAlimentos } from "@/lib/foods";
import NovaDietaForm from "@/components/NovaDietaForm";

export default async function NovaDietaPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: defaultStudentId } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  // "sex"/"activity_level" tolera a migração ainda não ter rodado — tenta
  // com os campos novos, e se falhar busca sem eles (calculadora de meta
  // calórica só fica indisponível até a migração rodar)
  let students: any[] | null = null;
  {
    const { data } = await supabase
      .from("students")
      .select("id, birth_date, sex, activity_level, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active");
    students = data;
  }
  if (!students) {
    const { data } = await supabase
      .from("students")
      .select("id, birth_date, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active");
    students = data;
  }

  const studentIds = (students ?? []).map((s) => s.id);

  const foods = await carregarAlimentos(supabase);

  // peso/altura mais recentes de cada aluno, pra calculadora de meta
  // calórica — pega tudo de uma vez e fica só com a primeira ocorrência
  // (mais recente) de cada aluno, já que a query vem ordenada por data
  const { data: evaluations } = studentIds.length
    ? await supabase
        .from("evaluations")
        .select("student_id, weight, height, date")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
    : { data: [] as { student_id: string; weight: number | null; height: number | null; date: string }[] };

  const latestByStudent = new Map<string, { weight: number | null; height: number | null }>();
  for (const ev of evaluations ?? []) {
    if (!latestByStudent.has(ev.student_id)) {
      latestByStudent.set(ev.student_id, { weight: ev.weight, height: ev.height });
    }
  }

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    birthDate: s.birth_date ?? null,
    sex: s.sex ?? null,
    activityLevel: s.activity_level ?? null,
    latestWeight: latestByStudent.get(s.id)?.weight ?? null,
    latestHeight: latestByStudent.get(s.id)?.height ?? null,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Criar plano alimentar</h1>
      <NovaDietaForm
        students={studentOptions}
        foods={foods ?? []}
        defaultStudentId={defaultStudentId}
      />
    </div>
  );
}
