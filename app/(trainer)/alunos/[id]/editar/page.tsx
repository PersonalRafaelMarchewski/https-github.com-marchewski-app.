import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarAlunoForm from "@/components/EditarAlunoForm";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, phone, goal, status, service_type, profiles:profile_id (name)")
    .eq("id", id)
    .single();

  if (!student) {
    return <Card className="text-blue">Aluno não encontrado.</Card>;
  }

  const profile = (student as any).profiles;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar aluno</h1>
      <EditarAlunoForm
        studentId={id}
        initialName={profile?.name ?? ""}
        initialPhone={student.phone ?? ""}
        initialGoal={student.goal ?? ""}
        initialStatus={student.status}
        initialServiceType={student.service_type ?? "assessoria"}
      />
    </div>
  );
}
