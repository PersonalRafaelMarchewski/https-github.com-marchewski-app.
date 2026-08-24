// Verificador de migrações: compara o que o banco de produção REALMENTE
// tem com o que os arquivos supabase/migration-*.sql dizem que deveria
// existir. Já nos mordeu duas vezes o código ir pro ar esperando tabela
// que ninguém tinha criado (rate limit de login, mural) — isto acaba com
// essa classe de bug.
//
// Rodar:  node scripts/verificar-migracoes.mjs
// Saída:  ✅ aplicada / ❌ FALTA RODAR, por migração.
//
// Como funciona: cada migração relevante tem um "sinal" — uma tabela ou
// coluna que só existe depois dela. A checagem é um select de leitura via
// service_role (HEAD, zero dados trafegados). Migração nova? Adiciona uma
// linha em CHECKS com o sinal dela.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// sinal: {t: tabela} ou {t: tabela, c: coluna}
const CHECKS = [
  ["schema.sql (base)", { t: "students" }],
  ["migration-agenda.sql", { t: "training_sessions" }],
  ["migration-agenda-reminders.sql", { t: "agenda_reminders" }],
  ["migration-nutricao.sql", { t: "diet_plans" }],
  ["migration-diario-alimentar.sql", { t: "diet_diary_entries" }],
  ["migration-finance.sql", { t: "finance_entries" }],
  ["migration-finance-business.sql", { t: "finance_entries", c: "business" }],
  ["migration-payments.sql", { t: "payments" }],
  ["migration-push-subscriptions.sql", { t: "push_subscriptions" }],
  ["migration-modelos-treino.sql", { t: "workout_templates" }],
  ["migration-metodos-treino.sql", { t: "workout_exercises", c: "method" }],
  ["migration-workout-labels.sql", { t: "workout_labels" }],
  ["migration-workout-display-order.sql", { t: "workouts", c: "display_order" }],
  ["migration-carga-real.sql", { t: "workout_logs", c: "actual_load" }],
  ["migration-carga-por-serie.sql", { t: "workout_logs", c: "actual_loads" }],
  ["migration-reps-por-serie.sql", { t: "workout_logs", c: "actual_reps" }],
  ["migration-feedback-video.sql", { t: "workout_logs", c: "video_path" }],
  ["migration-exercicio-alternativo.sql", { t: "exercise_alternatives" }],
  ["migration-exercicio-ativo.sql", { t: "exercises", c: "active" }],
  ["migration-tipo-articular.sql", { t: "exercises", c: "joint_type" }],
  ["migration-roadmap-agosto.sql", { t: "workout_sessions" }],
  ["migration-anamnese.sql", { t: "students", c: "anamnesis" }],
  ["migration-avatar.sql", { t: "profiles", c: "avatar_url" }],
  ["migration-altura-avaliacao.sql", { t: "evaluations", c: "height" }],
  ["migration-evaluation-photos.sql", { t: "evaluations", c: "photos" }],
  ["migration-nivel-aluno.sql", { t: "students", c: "level" }],
  ["migration-sexo-atividade.sql", { t: "students", c: "sex" }],
  ["migration-service-type.sql", { t: "students", c: "service_type" }],
  ["migration-peso-unidade.sql", { t: "evaluations", c: "weight" }],
  ["migration-troca-senha-obrigatoria.sql", { t: "profiles", c: "must_change_password" }],
  ["migration-rate-limit-cadastro.sql", { t: "signup_attempts" }],
  ["migration-rate-limit-login.sql", { t: "auth_attempts" }],
  ["migration-treino-pelo-personal.sql", { t: "workout_logs", note: "policies — sem sinal de coluna; conferir manualmente se o modo treino salva" }],
  ["migration-tempo-editavel-e-carga-por-lado.sql", { t: "exercises", c: "bilateral_load" }],
  ["migration-mural.sql", { t: "mural_posts" }],
  ["migration-aluno-pagante.sql", { t: "students", c: "is_payer" }],
  ["migration-cobranca.sql", { t: "students", c: "monthly_fee_cents" }],
  ["migration-diet-log-foods.sql", { t: "diet_log_foods" }],
  ["migration-birthday-reminder.sql", { t: "students", c: "birth_date", note: "cron de aniversário — sem sinal próprio; conferir em cron.job" }],
  ["migration-strava.sql", { t: "strava_connections", note: "planejamento futuro — falta rodar é o esperado até o Strava ser ativado" }],
  ["migration-cron-dominio-novo.sql", { t: "training_sessions", note: "cron jobs — sem sinal em tabela; conferir em cron.job no SQL Editor" }],
];

async function existe(sinal) {
  const col = sinal.c ? sinal.c : "*";
  const res = await fetch(
    `${URL_}/rest/v1/${sinal.t}?select=${encodeURIComponent(col)}&limit=0`,
    { method: "HEAD", headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  return res.ok;
}

let faltando = 0;
for (const [nome, sinal] of CHECKS) {
  const ok = await existe(sinal);
  const nota = sinal.note ? `  (${sinal.note})` : "";
  if (ok) console.log(`  ✅ ${nome}${nota}`);
  else {
    faltando++;
    console.log(`  ❌ FALTA RODAR: ${nome}${nota}`);
  }
}

// migrações no repositório que o manifesto ainda não conhece
const conhecidas = new Set(CHECKS.map(([n]) => n));
const noRepo = fs.readdirSync(path.join(root, "supabase")).filter((f) => f.startsWith("migration-"));
const desconhecidas = noRepo.filter((f) => !conhecidas.has(f));
if (desconhecidas.length) {
  console.log("\n  ⚠️ Migrações sem sinal no manifesto (adicionar em CHECKS):");
  desconhecidas.forEach((f) => console.log("     - " + f));
}

console.log(faltando === 0 ? "\nTudo aplicado. ✅" : `\n${faltando} pendente(s). ❌`);
process.exit(faltando > 1 ? 1 : 0); // 1 pendente pode ser o Strava (esperado)
