import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envPath = "C:\\Users\\Rafa Marchewski\\Claude code\\marchewski-app\\.env.local";
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "qa.teste.aluno@marchewskiassessoria.com";
const TRAINER_ID = "c04a6ec9-6b5d-42e4-aa5e-cf9d4f11ed67";

// limpa se já existir de uma rodada anterior
const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
const existing = existingUsers.users.find((u) => u.email === TEST_EMAIL);
if (existing) {
  const { data: st } = await admin.from("students").select("id").eq("profile_id", existing.id).maybeSingle();
  if (st) {
    const { data: wk } = await admin.from("workouts").select("id").eq("student_id", st.id);
    for (const w of wk ?? []) {
      await admin.from("workout_exercises").delete().eq("workout_id", w.id);
    }
    await admin.from("workouts").delete().eq("student_id", st.id);
    await admin.from("workout_logs").delete().eq("student_id", st.id);
    await admin.from("workout_sessions").delete().eq("student_id", st.id);
    await admin.from("evaluations").delete().eq("student_id", st.id);
    await admin.from("training_sessions").delete().eq("student_id", st.id);
    await admin.from("students").delete().eq("id", st.id);
  }
  await admin.from("profiles").delete().eq("id", existing.id);
  await admin.auth.admin.deleteUser(existing.id);
  console.log("Limpou aluno de teste anterior.");
}

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: "QaTeste!" + Math.random().toString(36).slice(2, 10),
  email_confirm: true,
});
if (createErr) throw createErr;
const studentUserId = created.user.id;

await admin.from("profiles").insert({
  id: studentUserId,
  role: "student",
  name: "QA Teste Aluno",
  email: TEST_EMAIL,
});

const { data: student, error: studErr } = await admin
  .from("students")
  .insert({
    trainer_id: TRAINER_ID,
    profile_id: studentUserId,
    phone: "15999999999",
    goal: "Hipertrofia",
    status: "active",
    service_type: "assessoria",
    birth_date: "1995-06-15",
    level: "intermediario",
    anamnesis: {
      possui_doenca: false,
      qual_doenca: "",
      toma_medicamento: false,
      qual_medicamento: "",
      fez_cirurgia: false,
      qual_cirurgia: "",
      tem_dor_lesao: false,
      qual_dor_lesao: "",
      pratica_atividade: true,
      qual_atividade: "Musculação",
      treina_atualmente: true,
      tempo_treino: "2 anos",
      tempo_parado: "",
      frequencia_atual: "4",
      frequencia_desejada: "5",
      dias_disponiveis: "5",
      tempo_disponivel: "1 hora",
      fumante: false,
      consome_alcool: false,
      qualidade_sono: "Boa",
      observacoes: "Conta de teste QA — pode apagar.",
    },
  })
  .select("id")
  .single();
if (studErr) throw studErr;

const { data: exercises } = await admin
  .from("exercises")
  .select("id, name, muscle_group")
  .in("name", ["Rosca martelo", "Remada baixa", "Tríceps corda"]);

const { data: workout, error: wkErr } = await admin
  .from("workouts")
  .insert({
    trainer_id: TRAINER_ID,
    student_id: student.id,
    name: "QA Teste - Treino A",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "active",
    display_order: 0,
  })
  .select("id")
  .single();
if (wkErr) throw wkErr;

const rows = exercises.map((ex, i) => ({
  workout_id: workout.id,
  exercise_id: ex.id,
  sets: 3,
  reps: "10-12",
  load: "20",
  rest_seconds: 60,
  order_index: i,
  label: "A",
  method: null,
}));
await admin.from("workout_exercises").insert(rows);

console.log("=== Aluno de teste criado ===");
console.log("email:", TEST_EMAIL);
console.log("student_id:", student.id);
console.log("workout_id:", workout.id);
console.log("exercícios:", exercises.map((e) => e.name));

// gera magic link (login sem senha) pra eu conseguir testar como esse aluno
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: TEST_EMAIL,
});
if (linkErr) throw linkErr;
console.log("=== MAGIC LINK ===");
console.log(linkData.properties.action_link);
