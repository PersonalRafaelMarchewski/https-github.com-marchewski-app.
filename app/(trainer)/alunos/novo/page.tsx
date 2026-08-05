"use client";

import { useActionState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { createStudent, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = { error: null, success: null };

export default function CadastroAlunoPage() {
  const [state, formAction, pending] = useActionState(createStudent, initialState);

  if (state.success) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-navy">Aluno cadastrado</h1>
        <Card className="max-w-md space-y-4">
          <p className="text-navy">
            Compartilhe esse acesso com o aluno (WhatsApp, etc). A senha só aparece aqui uma vez.
          </p>
          <div className="rounded-lg bg-lightblue/10 p-4 text-sm">
            <p>
              <span className="font-semibold text-navy">E-mail:</span> {state.success.email}
            </p>
            <p>
              <span className="font-semibold text-navy">Senha temporária:</span>{" "}
              <span className="font-mono">{state.success.password}</span>
            </p>
          </div>
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
            <label className="mb-1 block text-sm font-medium text-navy">
              Data de nascimento <span className="font-normal text-blue">(opcional)</span>
            </label>
            <input
              name="birth_date"
              type="date"
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Objetivo</label>
            <input
              name="goal"
              placeholder="Emagrecimento, hipertrofia..."
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
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
