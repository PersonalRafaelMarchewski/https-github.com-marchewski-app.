import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import EditarAlunoForm from "@/components/EditarAlunoForm";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import { getSignedAvatarUrl } from "@/lib/avatar";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // "sex"/"activity_level" tolera a migração ainda não ter rodado — sem
  // isso, um select com coluna inexistente falharia e derrubaria a
  // página inteira de editar aluno
  let student: any = null;
  {
    const { data } = await supabase
      .from("students")
      .select(
        "id, phone, goal, status, service_type, is_payer, monthly_fee_cents, due_day, birth_date, level, sex, activity_level, profiles:profile_id (name, email, avatar_url)"
      )
      .eq("id", id)
      .single();
    student = data;
  }
  if (!student) {
    const { data } = await supabase
      .from("students")
      .select("id, phone, goal, status, service_type, birth_date, level, profiles:profile_id (name, email, avatar_url)")
      .eq("id", id)
      .single();
    student = data;
  }

  if (!student) {
    return <Card className="text-blue">Aluno não encontrado.</Card>;
  }

  const profile = (student as any).profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Editar aluno</h1>
        <ResetPasswordButton studentId={id} studentEmail={profile?.email ?? ""} />
      </div>
      <EditarAlunoForm
        studentId={id}
        initialName={profile?.name ?? ""}
        initialEmail={profile?.email ?? ""}
        initialPhone={student.phone ?? ""}
        initialGoal={student.goal ?? ""}
        initialStatus={student.status}
        initialServiceType={student.service_type ?? "assessoria"}
        initialIsPayer={(student as any).is_payer !== false}
        initialMonthlyFee={(student as any).monthly_fee_cents ? String((student as any).monthly_fee_cents / 100) : ""}
        initialDueDay={(student as any).due_day ?? null}
        initialBirthDate={student.birth_date ?? ""}
        initialLevel={student.level ?? "intermediario"}
        initialSex={student.sex ?? ""}
        initialActivityLevel={student.activity_level ?? ""}
        avatarSignedUrl={avatarSignedUrl}
      />
    </div>
  );
}
