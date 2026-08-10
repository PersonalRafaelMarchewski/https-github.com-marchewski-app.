import { Resend } from "resend";

// Best-effort: se a chave ainda não estiver configurada (RESEND_API_KEY),
// não trava o cadastro — só não manda o e-mail. A senha continua
// aparecendo na tela como reforço, então ninguém fica sem acesso.
export async function sendWelcomeEmail({
  to,
  name,
  password,
}: {
  to: string;
  name: string;
  password: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false };

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://marchewskiassessoria.com"}/login`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Marchewski Assessoria Esportiva <contato@marchewskiassessoria.com>",
      to,
      subject: "Seu acesso ao app da Marchewski Assessoria Esportiva",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1f2556;">Bem-vindo(a), ${name}!</h2>
          <p>Seu cadastro foi recebido. Aqui está seu acesso ao app:</p>
          <table style="width: 100%; background: #f4f6fb; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <tr><td style="padding: 4px 0;"><strong>Link:</strong></td><td>${loginUrl}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>E-mail:</strong></td><td>${to}</td></tr>
            <tr><td style="padding: 4px 0;"><strong>Senha:</strong></td><td><code>${password}</code></td></tr>
          </table>
          <p>Recomendamos trocar a senha assim que entrar (em "Alterar senha").</p>
          <p style="color: #6b7280; font-size: 13px;">Marchewski Assessoria Esportiva</p>
        </div>
      `,
    });
    if (error) return { sent: false };
    return { sent: true };
  } catch {
    return { sent: false };
  }
}
