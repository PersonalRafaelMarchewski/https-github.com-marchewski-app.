import { createClient } from "@/lib/supabase/server";
import AnamneseForm from "@/components/AnamneseForm";
import Card from "@/components/Card";

export default async function AnamnesePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, anamnesis")
    .eq("profile_id", user!.id)
    .single();

  if (!student) {
    return <Card className="text-blue">Nenhum cadastro de aluno vinculado à sua conta ainda.</Card>;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-navy">Anamnese</h1>
      <p className="mb-6 text-blue">
        Essas informações ajudam seu personal a montar um treino seguro pra você.
      </p>
      <AnamneseForm studentId={student.id} initialData={student.anamnesis} />
    </div>
  );
}
