import Link from "next/link";
import Card from "@/components/Card";
import ReminderForm from "@/components/ReminderForm";
import DeleteButton from "@/components/DeleteButton";
import { createClient } from "@/lib/supabase/server";
import { deleteReminder } from "../../actions";

export default async function EditarLembretePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: reminder } = await supabase
    .from("agenda_reminders")
    .select("id, title, start_date, end_date, notes")
    .eq("id", id)
    .single();

  if (!reminder) {
    return <Card className="text-blue">Lembrete não encontrado.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Editar lembrete</h1>
        <DeleteButton
          action={deleteReminder.bind(null, id)}
          confirmMessage={`Excluir o lembrete "${reminder.title}"?`}
        />
      </div>

      <ReminderForm
        reminderId={id}
        initialData={{
          title: reminder.title,
          startDate: reminder.start_date,
          endDate: reminder.end_date,
          notes: reminder.notes ?? "",
        }}
      />

      <Link href="/agenda" className="block text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
