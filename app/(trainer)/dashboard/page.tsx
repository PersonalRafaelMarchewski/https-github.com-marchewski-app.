import Link from "next/link";
import { Plus, User, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, goal, status, profiles:profile_id (name, email, avatar_url)")
    .eq("trainer_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Meus alunos</h1>
        <div className="flex gap-3">
          <Link href="/alunos/novo">
            <Button variant="secondary" className="flex items-center gap-2">
              <UserPlus size={18} />
              Cadastrar aluno
            </Button>
          </Link>
          <Link href="/treinos/novo">
            <Button className="flex items-center gap-2">
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
        <Card className="text-center text-blue">
          Nenhum aluno ativo ainda.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student: any) => (
            <Link key={student.id} href={`/alunos/${student.id}`}>
              <Card className="flex items-center gap-3 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-peach/40 text-navy">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-heading font-semibold text-navy">
                    {student.profiles?.name}
                  </p>
                  <p className="text-sm text-blue">{student.goal ?? "Sem objetivo definido"}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
