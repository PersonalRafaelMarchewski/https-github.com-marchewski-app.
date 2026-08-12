// PGRST204 = a API do Supabase ainda não "viu" uma coluna que existe de
// verdade no banco (cache de schema desatualizado depois de uma migração
// recente) — já aconteceu de verdade com substituted_exercise_id. Em vez
// de travar o salvamento inteiro, tenta de novo sem o campo que a
// mensagem de erro aponta como "não encontrado".
export async function saveWithSchemaCacheRetry<T>(
  run: (payload: Record<string, any>) => PromiseLike<{ data: T | null; error: any }>,
  payload: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  let current = payload;
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await run(current);
    if (!result.error) return result;
    if (result.error.code !== "PGRST204") return result;

    const missingColumn = /'([^']+)' column/.exec(result.error.message ?? "")?.[1];
    if (!missingColumn || !(missingColumn in current)) return result;

    const { [missingColumn]: _omit, ...rest } = current;
    current = rest;
  }
  return { data: null, error: { message: "too many schema cache retries" } };
}
