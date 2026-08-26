import { Resend } from "resend";

// Best-effort: se a chave ainda não estiver configurada (RESEND_API_KEY),
// não trava o cadastro — só não manda o e-mail. A senha continua
// aparecendo na tela como reforço, então ninguém fica sem acesso.
export async function sendWelcomeEmail({
  to,
  name,
  password,
  sex,
  serviceType,
}: {
  to: string;
  name: string;
  password: string;
  // "F" | "M" | undefined — o cadastro público já pede o sexo biológico,
  // então isso deve sempre vir preenchido; o "Boas-vindas" sem gênero é só
  // uma rede de segurança pra cadastro antigo/sem esse dado
  sex?: string | null;
  // muda só a linha do "próximo passo": assessoria recebe o treino pelo
  // app em 24h, aluno presencial monta o treino na primeira aula
  serviceType?: "personal" | "assessoria";
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://marchewskiassessoria.com";
  const loginUrl = `${siteUrl}/login`;
  const logoUrl = `${siteUrl}/logo-positivo.png`;
  const whatsappUrl = "https://wa.me/5515991616955";
  const greeting = sex === "F" ? `Bem-vinda, ${name}!` : sex === "M" ? `Bem-vindo, ${name}!` : `Boas-vindas, ${name}!`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Marchewski Assessoria Esportiva <contato@marchewskiassessoria.com>",
      to,
      subject: "Seu acesso ao app da Marchewski Assessoria Esportiva",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoUrl}" alt="Marchewski Assessoria Esportiva" width="160" style="display: inline-block;" />
          </div>
          <h2 style="color: #1f2556; text-align: center; margin-bottom: 8px;">${greeting}</h2>
          <p style="color: #1f2556; text-align: center; font-style: italic; padding: 0 8px;">
            Mudar de vida não começa com o treino perfeito, começa com o básico bem feito,
            todo santo dia. Você acabou de dar o primeiro passo com o método
            <strong>Back to Basics</strong>.
          </p>
          <p>Seu cadastro foi recebido. Aqui está seu acesso ao app:</p>
          <table style="width: 100%; background: #f4f6fb; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <tr><td style="padding: 4px 0;"><strong>Link:</strong></td><td>${loginUrl}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>E-mail:</strong></td><td>${to}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Senha:</strong></td><td><code>${password}</code></td></tr>
          </table>
          <p>Recomendamos trocar a senha assim que entrar (em "Alterar senha").</p>
          <p>${
            serviceType === "personal"
              ? "📋 Seu treino a gente monta <strong>na sua primeira aula</strong> — e você acompanha tudo por aqui no app."
              : "📋 <strong>Em até 24 horas</strong> você vai receber seu treino personalizado direto no app."
          }</p>
          <p>Alguma dúvida? Chama no WhatsApp: <a href="${whatsappUrl}" style="color: #1f2556;">(15) 99161-6955</a></p>
          <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 24px;">
            Marchewski Assessoria Esportiva — Método Back to Basics
          </p>
        </div>
      `,
    });
    if (error) return { sent: false };
    return { sent: true };
  } catch {
    return { sent: false };
  }
}
