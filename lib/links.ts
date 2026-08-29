// Links fixos da assessoria que o personal compartilha com os alunos.

// Página pública de depoimento (app/depoimentos): o aluno preenche e o
// texto chega pronto no WhatsApp da assessoria. O link completo é montado
// com o domínio de onde o app está rodando (ver TestimonialLinkCard).
export const TESTIMONIALS_PATH = "/depoimentos";

// Convite padrão que o personal manda junto com o link.
export function testimonialsInvite(url: string): string {
  return `Oi! Estou reunindo depoimentos de quem treina comigo. Se puder, leva 2 minutinhos: ${url} 🙏`;
}
