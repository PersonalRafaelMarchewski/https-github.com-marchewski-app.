import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StudentsList from "@/components/StudentsList";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, goal, status, service_type, profiles:profile_id (name, email, avatar_url)")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Meus alunos</h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/alunos/novo">
            <Button variant="secondary" className="flex w-full items-center justify-center gap-2 sm:w-auto">
              <UserPlus size={18} />
              Cadastrar aluno
            </Button>
          </Link>
          <Link href="/treinos/novo">
            <Button className="flex w-full items-center justify-center gap-2 sm:w-auto">
              <Plus size={18} />
              Novo treino
            </Button>
          </Link>
        </div>
      </div>

      {studentsError && (
        <Card className="mb-4 text-orange">
          Erro ao carregar alunos: {studentsError.message}
        </Card>
      )}

      {!students || students.length === 0 ? (
        <Card className="text-center text-blue">Nenhum aluno cadastrado ainda.</Card>
      ) : (
        <StudentsList students={students as any} />
      )}
    </div>
  );
}
