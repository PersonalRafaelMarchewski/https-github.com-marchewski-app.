import { NextResponse, type NextRequest } from "next/server";
import stripe from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { requiredEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : ""}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").default.Checkout.Session;
      const isSubscription = session.mode === "subscription";

      await admin
        .from("payments")
        .update({
          status: isSubscription ? "active" : "paid",
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : null,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", session.id);

      if (isSubscription && session.metadata?.student_id) {
        await admin
          .from("students")
          .update({ subscription_status: "active" })
          .eq("id", session.metadata.student_id);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as import("stripe").default.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      // students.subscription_status guarda o status bruto do Stripe (sem constraint).
      await admin
        .from("students")
        .update({ subscription_status: subscription.status })
        .eq("stripe_customer_id", customerId);

      // payments.status tem constraint fixa — mapeia pro conjunto permitido.
      const paymentsStatus =
        subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : subscription.status === "past_due" || subscription.status === "incomplete"
            ? "failed"
            : "canceled";

      await admin
        .from("payments")
        .update({ status: paymentsStatus })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
