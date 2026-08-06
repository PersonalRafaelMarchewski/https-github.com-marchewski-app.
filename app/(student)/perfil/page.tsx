import { createClient } from "@/lib/supabase/server";
import Card from "@/components/Card";
import StudentAvatarUpload from "@/components/StudentAvatarUpload";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { getSignedAvatarUrl } from "@/lib/avatar";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, profiles:profile_id (name, avatar_url)")
    .eq("profile_id", user!.id)
    .single();

  const profile = (student as any)?.profiles;
  const avatarSignedUrl = await getSignedAvatarUrl(profile?.avatar_url);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Minha conta</h1>

      {student && (
        <Card>
          <p className="mb-3 text-sm font-medium text-navy">Minha foto</p>
          <StudentAvatarUpload studentId={student.id} initialSignedUrl={avatarSignedUrl} />
        </Card>
      )}

      <ChangePasswordForm />
    </div>
  );
}
