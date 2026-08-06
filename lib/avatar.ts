import { createAdminClient } from "@/lib/supabase/admin";

export const AVATAR_BUCKET = "avatars";

export async function getSignedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(AVATAR_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
