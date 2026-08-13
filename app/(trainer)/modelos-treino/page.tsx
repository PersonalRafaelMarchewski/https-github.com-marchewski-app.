import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Card from "@/components/Card";
import DeleteButton from "@/components/DeleteButton";
import { deleteWorkoutTemplate } from "./actions";

export default async function ModelosTreinoPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("id, name, workout_template_exercises (id)")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Modelos de treino</h1>
        <Link href="/treinos/novo" className="text-sm text-orange hover:underline">
          Criar treino
        </Link>
      </div>

      <p className="mb-6 text-sm text-blue">
        Modelos salvos a partir da tela de criar treino — aparecem lá no seletor "Usar modelo pronto".
      </p>

      {!templates || templates.length === 0 ? (
        <Card className="text-center text-blue">
          Nenhum modelo salvo ainda. Monte um treino e clique em "Salvar esses exercícios como modelo".
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-peach/30 text-navy">
                  <Dumbbell size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{t.name}</p>
                  <p className="text-sm text-blue">
                    {(t.workout_template_exercises ?? []).length} exercício
                    {(t.workout_template_exercises ?? []).length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <DeleteButton
                action={deleteWorkoutTemplate.bind(null, t.id)}
                confirmMessage={`Apagar o modelo "${t.name}"?`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
