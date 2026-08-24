"use client";

// Fila offline do registro de treino: academia é lugar de sinal ruim, e
// perder a carga anotada porque a internet caiu no meio do set é o pior
// momento possível. Quando o salvamento falha por rede, o registro fica
// guardado no aparelho (localStorage) e o OfflineSyncRunner reenvia
// sozinho quando a conexão volta.
//
// Um registro por (exercício + dia): re-tentativas e novas edições
// substituem o pendente em vez de duplicar. A sincronização confere se o
// log já existe no servidor (select) antes de decidir entre update e
// insert — cobre o caso do insert ter ido e a resposta ter se perdido.

const KEY = "pending-workout-logs-v1";

export type PendingLog = {
  workoutExerciseId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  payload: Record<string, unknown>; // campos do workout_logs (completed, cargas...)
  queuedAt: number;
};

function readAll(): Record<string, PendingLog> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, PendingLog>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // storage cheio/bloqueado — sem fila, o erro normal continua aparecendo
  }
}

const keyOf = (e: { workoutExerciseId: string; date: string }) =>
  `${e.workoutExerciseId}|${e.date}`;

export function enqueuePendingLog(entry: Omit<PendingLog, "queuedAt">) {
  const all = readAll();
  all[keyOf(entry)] = { ...entry, queuedAt: Date.now() };
  writeAll(all);
}

export function pendingCount(): number {
  return Object.keys(readAll()).length;
}

// erro de rede (offline, DNS, timeout) × erro de verdade (RLS, validação):
// só o primeiro vai pra fila — o segundo precisa aparecer pro usuário
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg =
    (error as any)?.message ?? (typeof error === "string" ? error : "");
  return /fetch|network|load failed|conex|internet/i.test(String(msg));
}

// Reenvia tudo que está na fila. `supabase` é o client do navegador (a
// sessão do usuário logado — a RLS continua valendo normalmente).
export async function syncPendingLogs(
  supabase: any
): Promise<{ synced: number; remaining: number }> {
  const all = readAll();
  const keys = Object.keys(all);
  let synced = 0;

  for (const k of keys) {
    const e = all[k];
    try {
      const { data: existing, error: selErr } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("student_id", e.studentId)
        .eq("date", e.date)
        .eq("workout_exercise_id", e.workoutExerciseId)
        .limit(1)
        .maybeSingle();
      if (selErr) continue; // ainda sem rede (ou erro momentâneo) — fica pra próxima

      let failed = false;
      if (existing?.id) {
        const { error } = await supabase
          .from("workout_logs")
          .update(e.payload)
          .eq("id", existing.id);
        failed = !!error;
      } else {
        const { error } = await supabase.from("workout_logs").insert({
          workout_exercise_id: e.workoutExerciseId,
          student_id: e.studentId,
          date: e.date,
          ...e.payload,
        });
        failed = !!error;
      }

      if (!failed) {
        delete all[k];
        synced++;
      }
    } catch {
      // rede caiu de novo no meio — o resto fica pra próxima rodada
      break;
    }
  }

  writeAll(all);
  return { synced, remaining: Object.keys(all).length };
}
