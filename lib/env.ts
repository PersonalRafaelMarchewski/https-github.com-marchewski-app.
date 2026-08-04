export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável de ambiente ausente ou vazia: ${name}`);
  }
  return value.trim();
}
