import { createClient, getAuthUser } from "@/lib/supabase/server";
import StudentCard from "@/components/student/StudentCard";
import StudentAvatarUpload from "@/components/StudentAvatarUpload";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import StravaCard from "@/components/StravaCard";
import { getSignedAvatarUrl } from "@/lib/avatar";
import { stravaConfigured } from "@/lib/strava";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const supabase = await createClient();
  const user = await getAuthUser();
  const { strava: stravaFeedback } = await searchParams;

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name, avatar_url)")
    .eq("profile_id", user!.id)
    .single();

  const profile = (student as any)?.profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  // a conexão do Strava fica numa tabela sem policy (tokens sensíveis) —
  // o "está conectado?" é checado no servidor via service_role, sempre do
  // próprio usuário da sessão. A tabela pode ainda não existir (migração
  // pendente) — nesse caso trata como desconectado e segue.
  let stravaConnected = false;
  const showStrava = stravaConfigured();
  if (showStrava) {
    try {
      const admin = createAdminClient();
      const { data: conn } = await admin
        .from("strava_connections")
        .select("profile_id")
        .eq("profile_id", user!.id)
        .maybeSingle();
      stravaConnected = Boolean(conn);
    } catch {
      stravaConnected = false;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Minha conta</h1>

      {student && (
        <StudentCard>
          <p className="mb-3 text-sm font-medium text-navy">Minha foto</p>
          <StudentAvatarUpload studentId={student.id} initialSignedUrl={avatarSignedUrl} />
        </StudentCard>
      )}

      {showStrava && (
        <StravaCard connected={stravaConnected} feedbackQuery={stravaFeedback ?? null} />
      )}

      <ChangePasswordForm />
    </div>
  );
}
