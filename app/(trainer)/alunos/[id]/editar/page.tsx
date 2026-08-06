import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarAlunoForm from "@/components/EditarAlunoForm";
import { getSignedAvatarUrl } from "@/lib/avatar";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, phone, goal, status, service_type, birth_date, level, profiles:profile_id (name, email, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (!student) {
    return <Card className="text-blue">Aluno não encontrado.</Card>;
  }

  const profile = (student as any).profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Editar aluno</h1>
      <EditarAlunoForm
        studentId={id}
        initialName={profile?.name ?? ""}
        initialEmail={profile?.email ?? ""}
        initialPhone={student.phone ?? ""}
        initialGoal={student.goal ?? ""}
        initialStatus={student.status}
        initialServiceType={student.service_type ?? "assessoria"}
        initialBirthDate={student.birth_date ?? ""}
        initialLevel={student.level ?? "intermediario"}
        avatarSignedUrl={avatarSignedUrl}
      />
    </div>
  );
}
