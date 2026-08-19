import { createClient, getAuthUser } from "@/lib/supabase/server";
import NovoTreinoForm from "@/components/NovoTreinoForm";

export default async function NovoTreinoPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: defaultStudentId } = await searchParams;
  const supabase = await createClient();
  const user = await getAuthUser();

  // "workout_templates" tolera a tabela ainda não existir (migração
  // pendente) — supabase-js não lança erro, só devolve data: null
  const [{ data: students }, { data: exercisesWithActive }, { data: templates }] = await Promise.all([
    supabase
      .from("students")
      .select("id, level, profiles:profile_id (name)")
      .eq("trainer_id", user!.id)
      .eq("status", "active"),
    supabase.from("exercises").select("id, name, muscle_group, active").order("name"),
    supabase.from("workout_templates").select("id, name").eq("trainer_id", user!.id).order("name"),
  ]);

  // "active" tolera a migração ainda não ter rodado — sem ela, o select
  // acima volta null e caímos pra versão sem o campo (mostra tudo)
  let exercises: any[] | null = exercisesWithActive;
  if (!exercises) {
    const { data } = await supabase.from("exercises").select("id, name, muscle_group").order("name");
    exercises = data;
  } else {
    // só oferece pra escolher os exercícios ativos ao montar treino novo —
    // os inativos (duplicados/descontinuados) continuam existindo, só não
    // aparecem aqui pra não confundir na hora de prescrever
    exercises = exercises.filter((e: any) => e.active !== false);
  }

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.name ?? "Aluno sem nome",
    level: s.level ?? "intermediario",
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Criar treino</h1>
      <NovoTreinoForm
        students={studentOptions}
        exercises={exercises ?? []}
        defaultStudentId={defaultStudentId}
        templates={templates ?? []}
      />
    </div>
  );
}
