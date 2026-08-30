"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StudentAvatarUpload from "@/components/StudentAvatarUpload";
import LevelPicker from "@/components/LevelPicker";
import GoalPicker from "@/components/GoalPicker";
import SexPicker from "@/components/SexPicker";
import ActivityLevelPicker from "@/components/ActivityLevelPicker";
import { updateStudent, type UpdateStudentState } from "@/app/(trainer)/alunos/[id]/actions";

const initialState: UpdateStudentState = { error: null };

export default function EditarAlunoForm({
  studentId,
  initialName,
  initialEmail,
  initialPhone,
  initialGoal,
  initialStatus,
  initialServiceType,
  initialIsPayer = true,
  initialMonthlyFee = "",
  initialDueDay = null,
  initialBirthDate,
  initialLevel,
  initialSex,
  initialActivityLevel,
  avatarSignedUrl,
}: {
  studentId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialGoal: string;
  initialStatus: string;
  initialServiceType: string;
  initialIsPayer?: boolean;
  initialMonthlyFee?: string;
  initialDueDay?: number | null;
  initialBirthDate: string;
  initialLevel: string;
  initialSex: string;
  initialActivityLevel: string;
  avatarSignedUrl: string | null;
}) {
  const boundAction = updateStudent.bind(null, studentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [level, setLevel] = useState(initialLevel);
  const [goal, setGoal] = useState(initialGoal);
  const [sex, setSex] = useState(initialSex);
  const [activityLevel, setActivityLevel] = useState(initialActivityLevel);
  // Campos de texto/select controlados (padrão #11 do runbook): o React 19
  // reseta inputs não controlados depois da action — se o servidor devolvia
  // erro (e-mail em uso, etc.), o formulário inteiro voltava pro valor
  // inicial e o Rafa tinha que digitar tudo de novo.
  const [dados, setDados] = useState({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
    birth_date: initialBirthDate,
    status: initialStatus,
    service_type: initialServiceType,
    is_payer: initialIsPayer ? "true" : "false",
    monthly_fee: initialMonthlyFee,
    due_day: initialDueDay == null ? "" : String(initialDueDay),
  });
  function setD<K extends keyof typeof dados>(key: K, value: string) {
    setDados((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card className="max-w-md">
      <div className="mb-5">
        <StudentAvatarUpload studentId={studentId} initialSignedUrl={avatarSignedUrl} />
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nome</label>
          <input
            name="name"
            value={dados.name}
            onChange={(e) => setD("name", e.target.value)}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">E-mail</label>
          <input
            name="email"
            type="email"
            value={dados.email}
            onChange={(e) => setD("email", e.target.value)}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
          <p className="mt-1 text-xs text-blue">
            É também o e-mail que o aluno usa pra entrar no app — mudar aqui muda o login dele.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Telefone</label>
          <input
            name="phone"
            value={dados.phone}
            onChange={(e) => setD("phone", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Data de nascimento <span className="font-normal text-blue">(opcional)</span>
          </label>
          <input
            name="birth_date"
            type="date"
            value={dados.birth_date}
            onChange={(e) => setD("birth_date", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nível de treinamento</label>
          <LevelPicker value={level} onChange={setLevel} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Objetivo</label>
          <GoalPicker value={goal} onChange={setGoal} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Sexo biológico <span className="font-normal text-blue">(opcional)</span>
          </label>
          <SexPicker value={sex} onChange={setSex} />
          <p className="mt-1 text-xs text-blue">
            Junto com peso, altura e nível de atividade, permite calcular a meta calórica
            automaticamente na hora de montar a dieta.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Nível de atividade física <span className="font-normal text-blue">(opcional)</span>
          </label>
          <ActivityLevelPicker value={activityLevel} onChange={setActivityLevel} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Status</label>
          <select
            name="status"
            value={dados.status}
            onChange={(e) => setD("status", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Tipo de serviço</label>
          <select
            name="service_type"
            value={dados.service_type}
            onChange={(e) => setD("service_type", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="assessoria">Assessoria</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Cobrança</label>
          <select
            name="is_payer"
            value={dados.is_payer}
            onChange={(e) => setD("is_payer", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="true">Pagante</option>
            <option value="false">Não pagante (bolsista/cortesia)</option>
          </select>
          <p className="mt-1 text-xs text-blue">
            Não pagante fica fora da lista &ldquo;Quem pagou no mês&rdquo; do Financeiro.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Mensalidade <span className="font-normal text-blue">(R$)</span>
            </label>
            <input
              name="monthly_fee"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={dados.monthly_fee}
              onChange={(e) => setD("monthly_fee", e.target.value)}
              placeholder="ex: 350"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Vencimento <span className="font-normal text-blue">(dia)</span>
            </label>
            <input
              name="due_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              value={dados.due_day}
              onChange={(e) => setD("due_day", e.target.value)}
              placeholder="ex: 10"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </Card>
  );
}
