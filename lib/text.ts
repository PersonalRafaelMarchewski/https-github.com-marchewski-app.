// Normaliza texto pra busca: minúsculo e sem acento, assim "joao" encontra
// "João" e vice-versa.
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
