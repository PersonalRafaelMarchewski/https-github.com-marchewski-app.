"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { updateStudent, type UpdateStudentState } from "@/app/(trainer)/alunos/[id]/actions";

const initialState: UpdateStudentState = { error: null };

export default function EditarAlunoForm({
  studentId,
  initialName,
  initialPhone,
  initialGoal,
  initialStatus,
}: {
  studentId: string;
  initialName: string;
  initialPhone: string;
  initialGoal: string;
  initialStatus: string;
}) {
  const boundAction = updateStudent.bind(null, studentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Card className="max-w-md">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Nome</label>
          <input
            name="name"
            defaultValue={initialName}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Telefone</label>
          <input
            name="phone"
            defaultValue={initialPhone}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Objetivo</label>
          <input
            name="goal"
            defaultValue={initialGoal}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Status</label>
          <select
            name="status"
            defaultValue={initialStatus}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>

        {state.error && <p className="text-sm text-orange">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </Card>
  );
}
