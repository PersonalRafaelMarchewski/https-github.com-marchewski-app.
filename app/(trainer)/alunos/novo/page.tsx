"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import AccessCredentialsCard from "@/components/AccessCredentialsCard";
import PublicSignupLinkCard from "@/components/PublicSignupLinkCard";
import LevelPicker from "@/components/LevelPicker";
import GoalPicker from "@/components/GoalPicker";
import { createStudent, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = { error: null, success: null };

export default function CadastroAlunoPage() {
  const [state, formAction, pending] = useActionState(createStudent, initialState);
  const [level, setLevel] = useState("intermediario");
  const [goal, setGoal] = useState("");

  if (state.success) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-navy">Aluno cadastrado</h1>
        <Card className="max-w-md space-y-4">
          <AccessCredentialsCard
            email={state.success.email}
            password={state.success.password}
            title="Compartilhe esse acesso com o aluno (WhatsApp, etc). A senha só aparece aqui uma vez."
          />
          <Link href={`/alunos/${state.success.studentId}`}>
            <Button className="w-full">Ver aluno</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Cadastrar aluno</h1>

      <div className="mb-6">
        <PublicSignupLinkCard />
      </div>

      <Card className="max-w-md">
        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Nome</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Telefone</label>
            <input
              name="phone"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Data de nascimento</label>
            <input
              name="birth_date"
              type="date"
              required
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Nível de treinamento</label>
            <LevelPicker value={level} onChange={setLevel} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Objetivo</label>
            <GoalPicker value={goal} onChange={setGoal} placeholder="Emagrecimento, hipertrofia..." />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Tipo de serviço</label>
            <select
              name="service_type"
              defaultValue="assessoria"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            >
              <option value="assessoria">Assessoria</option>
              <option value="personal">Personal</option>
            </select>
            <p className="mt-1 text-xs text-blue">
              Usado pra agrupar os alunos e facilitar na hora de agendar aulas.
            </p>
          </div>

          {state.error && <p className="text-sm text-orange">{state.error}</p>}

          <p className="text-xs text-blue">
            Você vai receber uma senha temporária pra compartilhar com o aluno.
          </p>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Cadastrando..." : "Cadastrar aluno"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
