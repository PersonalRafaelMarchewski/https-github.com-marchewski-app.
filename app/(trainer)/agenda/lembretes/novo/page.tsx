import Link from "next/link";
import ReminderForm from "@/components/ReminderForm";

export default async function NovoLembretePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Novo lembrete</h1>
      <ReminderForm defaultDate={date} />
      <Link href="/agenda" className="block text-sm text-blue hover:underline">
        ← Voltar pra agenda
      </Link>
    </div>
  );
}
