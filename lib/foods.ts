// Carga da tabela de alimentos pro FoodPicker.
//
// O PostgREST da Supabase corta toda resposta num teto de linhas (`max-rows`,
// tipicamente 1000) e faz isso **sem devolver erro** — a query simplesmente
// vem curta e o resto do alimento some da busca sem ninguém perceber. A base
// já passou de 780 alimentos e cresce a cada leva nova, então buscar tudo de
// uma vez é uma bomba-relógio: quando estourar, o personal vai digitar
// "tilápia" e não achar, sem nenhuma pista do motivo.
//
// A paginação abaixo não depende de saber qual é o teto: pede em blocos de
// TAMANHO_BLOCO e para quando um bloco vem incompleto (ou seja, acabou). Se o
// teto do projeto for menor que o bloco, o primeiro bloco já vem curto e o
// loop encerra — por isso o bloco é conservador.

import type { SupabaseClient } from "@supabase/supabase-js";

const TAMANHO_BLOCO = 500;

const COLUNAS_COM_UNIDADE =
  "id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, unit_weight_g";
const COLUNAS_BASE =
  "id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g";

async function buscarPaginado(
  supabase: SupabaseClient,
  colunas: string
): Promise<any[] | null> {
  const todos: any[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_BLOCO) {
    const { data, error } = await supabase
      .from("foods")
      .select(colunas)
      .order("name")
      .range(inicio, inicio + TAMANHO_BLOCO - 1);

    if (error) return null;
    todos.push(...(data ?? []));
    if ((data?.length ?? 0) < TAMANHO_BLOCO) return todos;
  }
}

// "unit_weight_g" tolera a migração ainda não ter rodado — sem ele, o modo
// "unidade" continua funcionando, só sem preencher o peso sozinho.
export async function carregarAlimentos(supabase: SupabaseClient): Promise<any[]> {
  return (
    (await buscarPaginado(supabase, COLUNAS_COM_UNIDADE)) ??
    (await buscarPaginado(supabase, COLUNAS_BASE)) ??
    []
  );
}
