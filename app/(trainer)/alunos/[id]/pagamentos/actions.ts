"use server";

import { createClient } from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import { requiredEnv } from "@/lib/env";

export type CreateChargeState = { error: string | null; url: string | null };

export async function createCheckoutSession(
  studentId: string,
  _prevState: CreateChargeState,
  formData: FormData
): Promise<CreateChargeState> {
  const type = String(formData.get("type") ?? "one_time") as "subscription" | "one_time";
  const amountReais = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim() || "Assessoria esportiva";

  if (!amountReais || amountReais <= 0) {
    return { error: "Informe um valor válido.", url: null };
  }

  const supabase = await createClient();
  const {
    data: { user: trainer },
  } = await supabase.auth.getUser();

  if (!trainer) {
    return { error: "Não autenticado.", url: null };
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, stripe_customer_id, profiles:profile_id (name, email)")
    .eq("id", studentId)
    .single();

  if (!student) {
    return { error: "Aluno não encontrado.", url: null };
  }

  const amountCents = Math.round(amountReais * 100);
  const siteUrl = requiredEnv("NEXT_PUBLIC_SITE_URL");

  let customerId = student.stripe_customer_id;
  if (!customerId) {
    const profile = (student as any).profiles;
    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.name,
      metadata: { student_id: studentId },
    });
    customerId = customer.id;
    await supabase.from("students").update({ stripe_customer_id: customerId }).eq("id", studentId);
  }

  let session;
  try {
    if (type === "subscription") {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              unit_amount: amountCents,
              recurring: { interval: "month" },
              product_data: { name: description },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/alunos/${studentId}?payment=success`,
        cancel_url: `${siteUrl}/alunos/${studentId}?payment=canceled`,
        metadata: { student_id: studentId, trainer_id: trainer.id },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card", "pix"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              unit_amount: amountCents,
              product_data: { name: description },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/alunos/${studentId}?payment=success`,
        cancel_url: `${siteUrl}/alunos/${studentId}?payment=canceled`,
        metadata: { student_id: studentId, trainer_id: trainer.id },
      });
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível criar a cobrança no Stripe.",
      url: null,
    };
  }

  const { error: insertError } = await supabase.from("payments").insert({
    student_id: studentId,
    trainer_id: trainer.id,
    type,
    amount_cents: amountCents,
    currency: "brl",
    description,
    stripe_checkout_session_id: session.id,
    status: "pending",
  });

  if (insertError) {
    return {
      error: "Cobrança criada no Stripe, mas houve erro ao salvar no histórico.",
      url: session.url,
    };
  }

  return { error: null, url: session.url };
}
