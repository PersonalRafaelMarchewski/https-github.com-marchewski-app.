# Criar dados de teste (aluno / treino / dieta)

## Convenção de script temporário
- Nome: `_alguma_coisa.mjs` na **raiz** do projeto (já cai no `.gitignore` via
  o padrão `_*.mjs` — nunca vai pro commit, não precisa se preocupar em
  esquecer no repo).
- Service-role do Supabase, lendo `.env.local` manualmente (sem depender de
  `dotenv`, que não está instalado):
  ```js
  import { createClient } from "@supabase/supabase-js";
  import fs from "fs";

  const envPath = "C:\\Users\\Rafa Marchewski\\Claude code\\marchewski-app\\.env.local";
  const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
  );

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  ```
- Rode com `node _nome.mjs`, log de cada etapa criada.
- Script **um-tiro** (seed único, script de verificação pontual): apague
  depois de rodar (`rm _nome.mjs`), já que o resultado fica gravado no banco.
- Script **reutilizável** (ex. recriar a conta QA do zero sempre que
  precisar): mantenha com nome descritivo — já existem
  `_setup_qa_student.mjs` e `_setup_qa_trainer.mjs` na raiz pra isso, com
  lógica de "se já existir, limpa e recria".
- **Nunca** insira dado de teste numa conta de aluno real — só nas contas QA
  ou numa conta "-teste" dedicada.

## Criar aluno completo (auth + perfil + avaliação)
```
admin.auth.admin.createUser({ email, password, email_confirm: true })
→ insert profiles (id = user.id, role: "student", name, email)
→ insert students (profile_id, trainer_id, sex, activity_level, level,
   goal, service_type, birth_date, anamnesis: { frequencia_atual, ... })
→ insert evaluations (student_id, date, weight, height, ...) — sem isso a
   calculadora de meta calórica fica "faltando peso"
```
`trainer_id` da conta real do Rafa: `c04a6ec9-6b5d-42e4-aa5e-cf9d4f11ed67`
(confirme de novo com uma query antes de usar num script novo, caso tenha
mudado).

## Criar treinos (fichas)
Mesmo padrão do form real (`NovoTreinoForm.tsx`): 1 row em `workouts`
(`status: "active"`) + várias rows em `workout_exercises`
(`label` tipo "A"/"B"/..., `order_index` sequencial, `sets`, `reps`).
- **Um workout pode ter mais de um `label`** (blocos A/B dentro da mesma
  ficha) — isso é uma feature real do app, não um bug; a UI já disambigua
  isso mostrando "Bloco {label}" quando o nome se repete (ver
  `nameCounts` em `FichaCarousel.tsx`).
- Compostos/multiarticulares primeiro em cada bloco, isolados por último.
- Convenção de volume: grupo grande = ~15 séries (5 exercícios × 3 séries),
  grupo pequeno = ~9 séries (3×3), abdômen = ~6 séries (2×3).
- Exercício de cardio: 1 exercício do grupo "Cardio", `sets: 1`,
  `reps: "60 min"` (texto livre, não numérico).
- **Atenção:** a tabela `workouts` **não tem coluna `created_at`** — não
  peça `.order("created_at")` nela, vai dar `42703`. Use `select("*")` sem
  ordenar, ou ordene por outra coluna que exista.

## Criar dieta
1 row em `diet_plans` (`daily_calories/protein/carbs/fat`) + várias rows em
`diet_meals` (uma por refeição, com seus próprios totais) + várias rows em
`diet_meal_foods` (alimento + quantidade em gramas, por refeição) —
**essa é a tabela que o aluno vê como "prescrito"**, separada de
`diet_log_foods` (o que ele realmente registrou no diário).

### Cálculo de meta calórica (mesma fórmula da calculadora do app,
`lib/nutritionCalc.ts`)
- **Basal (Mifflin-St Jeor):**
  `10×peso(kg) + 6,25×altura(cm) − 5×idade + (5 se homem, −161 se mulher)`
- **× fator de atividade:**

  | Nível | Fator |
  |---|---|
  | sedentário | 1,20 |
  | leve | 1,375 |
  | moderado | 1,55 |
  | intenso | 1,725 |
  | muito_intenso | 1,90 |

- **± déficit/superávit** conforme o objetivo pedido.
- Proteína e gordura geralmente entram como valor fixo pedido (g/kg ou g
  absoluto); **carboidrato preenche o resto** das calorias
  (`(meta − proteína×4 − gordura×9) ÷ 4`), nunca o contrário.

### Alimentos já usados (IDs confirmados na tabela `foods`)
| Alimento | `food_id` | kcal/P/C/G por 100g |
|---|---|---|
| Pão forma integral | `e265a8ec-3247-4c60-acbc-b56ddbcaf862` | 253,19 / 9,43 / 49,94 / 3,65 |
| Ovo mexido simples | `ab087935-22fb-436e-b08e-b89682e20e36` | 149 / 9,99 / 1,61 / 10,98 |
| Arroz tipo 1 cozido | `c0733cee-8e20-40a5-8f90-a18bf2748252` | 128,26 / 2,52 / 28,06 / 0,23 |
| Frango peito grelhado | `0c816bdc-c258-4d12-ba97-9afbde5aaa15` | 159,19 / 32,03 / 0 / 2,48 |
| Iogurte natural integral | `d80c8d8f-2dfe-4360-850b-b7eb7b0ac390` | 75,5 / 4,1 / 6 / 3,9 |
| Banana prata crua | `ed768f5d-2a93-43d2-abb8-3b74ee628995` | 98,25 / 1,27 / 25,96 / 0,07 |
| Azeite extra virgem | `29f81f46-81ca-4978-9ac4-b2bb0ad74f5e` | 884 / 0 / 0 / 100 |
| Batata doce cozida | `edd31312-3d3c-4217-8bc8-f7dcb293d3e3` | 76,76 / 0,64 / 18,42 / 0,09 |
| Whey concentrado (pó) | `18738611-f9b5-408e-a60d-a53d01f1b7a1` | 407 / 76,7 / 13,3 / 5,3 |

Antes de reusar, **confirme que o ID ainda existe** com uma query rápida —
esta tabela é uma referência, não a fonte da verdade.

## Verificação depois de semear
- Confirme pelo login do próprio aluno (senha que o script gerou) que
  treino(s) e dieta aparecem certinho em `/treino-do-dia` e `/nutricao`.
- Se criou algo numa conta QA só pra testar um bug específico (não pra ficar
  permanente), **limpe depois**: delete as rows criadas
  (`workout_exercises` → `workouts`, nessa ordem por causa de FK) e confirme
  que não sobrou lixo.
