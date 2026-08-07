// WhatsApp do personal — usado no botão de "tirar dúvidas" que aparece
// pro aluno em todas as telas. Trocar aqui se o número mudar.

const TRAINER_WHATSAPP = "5515991616955";

export function trainerWhatsAppUrl(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${TRAINER_WHATSAPP}${text}`;
}
