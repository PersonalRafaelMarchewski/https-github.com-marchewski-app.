"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import StudentAvatarUpload from "@/components/StudentAvatarUpload";
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
  initialBirthDate,
  avatarSignedUrl,
}: {
  studentId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialGoal: string;
  initialStatus: string;
  initialServiceType: string;
  initialBirthDate: string;
  avatarSignedUrl: string | null;
}) {
  const boundAction = updateStudent.bind(null, studentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

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
            defaultValue={initialName}
            required
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">E-mail</label>
          <input
            name="email"
            type="email"
            defaultValue={initialEmail}
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
            defaultValue={initialPhone}
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
            defaultValue={initialBirthDate}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Tipo de serviço</label>
          <select
            name="service_type"
            defaultValue={initialServiceType}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="assessoria">Assessoria</option>
            <option value="personal">Personal</option>
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
