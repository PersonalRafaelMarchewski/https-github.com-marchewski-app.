import "server-only";
import webpush from "web-push";
import { requiredEnv } from "@/lib/env";

webpush.setVapidDetails(
  requiredEnv("VAPID_SUBJECT"),
  requiredEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
  requiredEnv("VAPID_PRIVATE_KEY")
);

export default webpush;
