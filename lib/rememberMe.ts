// Por padrão o Supabase mantém a sessão logada por ~400 dias, mesmo
// fechando o navegador (é assim que o app já funciona hoje). Quando o
// aluno/personal desmarca "Manter conectado", rebaixamos o cookie de
// sessão pra um cookie "de aba" — sem Max-Age, o que faz o navegador
// apagá-lo sozinho ao fechar de vez (não só trocar de aba).
//
// Só mexe no Max-Age do cookie que o Supabase acabou de gravar; o valor
// e o nome continuam exatamente os mesmos, então a sessão em si não é
// afetada — só quanto tempo ela sobrevive a um fechamento do navegador.
const AUTH_COOKIE_PATTERN = /^(sb-[^=]+-auth-token)(\.\d+)?$/;

export function makeSessionCookiesTabOnly() {
  if (typeof document === "undefined") return;

  const pairs = document.cookie.split("; ").filter(Boolean);
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!AUTH_COOKIE_PATTERN.test(name)) continue;

    // reescreve sem max-age/expires — vira cookie de sessão do navegador
    document.cookie = `${name}=${value}; path=/; samesite=lax`;
  }
}

// O SDK do Supabase regrava o cookie sozinho (com validade longa) em
// vários momentos depois do login — logo em seguida, e depois a cada
// refresh de token. Por isso não basta rebaixar uma vez: marcamos a
// preferência em sessionStorage (que já morre sozinho quando o
// navegador fecha de vez, exatamente o comportamento que queremos) e
// reaplicamos o rebaixamento toda vez que o SDK reagir a um evento de
// auth — ver components/RememberMeGuard.tsx, montado no layout raiz.
export const NO_REMEMBER_KEY = "mw-no-remember";

export function markSessionAsNotRemembered() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(NO_REMEMBER_KEY, "1");
}

export function isSessionMarkedAsNotRemembered() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(NO_REMEMBER_KEY) === "1";
}
