// Regra de senha em um lugar só — antes o "6" estava espalhado por três
// telas (primeiro login, trocar senha no perfil, redefinir por e-mail), o
// que já é o tipo de coisa que sai de sincronia quando muda.
//
// ATENÇÃO: isso aqui é validação de tela, ou seja, mensagem boa pro usuário.
// Quem realmente impede senha fraca é o Supabase (Authentication →
// Policies → Minimum password length), porque o login e a troca de senha
// falam direto com ele — sem passar pelo nosso servidor.
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT = `Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;

export function validatePassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password !== confirmPassword) {
    return "As senhas não coincidem.";
  }
  return null;
}
