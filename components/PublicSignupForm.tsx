"use client";

import { useActionState, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import LevelPicker from "@/components/LevelPicker";
import GoalPicker from "@/components/GoalPicker";
import SexPicker from "@/components/SexPicker";
import AccessCredentialsCard from "@/components/AccessCredentialsCard";
import TurnstileWidget from "@/components/TurnstileWidget";
import { submitStudentSignup, type PublicSignupState } from "@/app/cadastro/actions";

type Anamnese = {
  possui_doenca: boolean;
  qual_doenca: string;
  toma_medicamento: boolean;
  qual_medicamento: string;
  fez_cirurgia: boolean;
  qual_cirurgia: string;
  tem_dor_lesao: boolean;
  qual_dor_lesao: string;
  pratica_atividade: boolean;
  qual_atividade: string;
  treina_atualmente: boolean;
  tempo_treino: string;
  tempo_parado: string;
  frequencia_atual: string;
  frequencia_desejada: string;
  dias_disponiveis: string;
  tempo_disponivel: string;
  fumante: boolean;
  consome_alcool: boolean;
  qualidade_sono: string;
  observacoes: string;
};

const EMPTY_ANAMNESE: Anamnese = {
  possui_doenca: false,
  qual_doenca: "",
  toma_medicamento: false,
  qual_medicamento: "",
  fez_cirurgia: false,
  qual_cirurgia: "",
  tem_dor_lesao: false,
  qual_dor_lesao: "",
  pratica_atividade: false,
  qual_atividade: "",
  treina_atualmente: false,
  tempo_treino: "",
  tempo_parado: "",
  frequencia_atual: "",
  frequencia_desejada: "",
  dias_disponiveis: "",
  tempo_disponivel: "",
  fumante: false,
  consome_alcool: false,
  qualidade_sono: "Boa",
  observacoes: "",
};

const initialState: PublicSignupState = { error: null, success: null };

function YesNoField({
  label,
  value,
  onChange,
  detailLabel,
  detailValue,
  onDetailChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  detailLabel: string;
  detailValue: string;
  onDetailChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-navy">{label}</label>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              value ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              !value ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
            }`}
          >
            Não
          </button>
        </div>
      </div>
      {value && (
        <input
          value={detailValue}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailLabel}
          className="mt-2 w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      )}
    </div>
  );
}

export default function PublicSignupForm({
  serviceType = "assessoria",
}: {
  // cada link público cadastra num tipo: /cadastro = assessoria (online),
  // /cadastro/personal = aluno presencial
  serviceType?: "personal" | "assessoria";
}) {
  const [state, formAction, pending] = useActionState(submitStudentSignup, initialState);
  const [level, setLevel] = useState("intermediario");
  const [goal, setGoal] = useState("");
  const [sex, setSex] = useState("");
  const [anamnese, setAnamnese] = useState<Anamnese>(EMPTY_ANAMNESE);
  // Campos de texto controlados: se a validação (do navegador ou do servidor)
  // barrar o envio, nada que a pessoa digitou se perde — o React 19 reseta
  // inputs não controlados depois de rodar a action, e era isso que zerava
  // o formulário inteiro quando faltava um campo obrigatório.
  const [dados, setDados] = useState({
    name: "",
    email: "",
    phone: "",
    birth_date: "",
    height_cm: "",
    weight_kg: "",
  });
  // erro de validação local (ex: sexo biológico sem escolher) — barra o envio
  // antes de ir pro servidor, com os dados intactos
  const [localError, setLocalError] = useState<string | null>(null);

  function set<K extends keyof Anamnese>(key: K, value: Anamnese[K]) {
    setAnamnese((prev) => ({ ...prev, [key]: value }));
  }

  function setD<K extends keyof typeof dados>(key: K, value: string) {
    setDados((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // os campos com `required` o próprio navegador segura; o sexo biológico é
    // botão (o navegador não valida), então conferimos aqui
    if (sex !== "F" && sex !== "M") {
      e.preventDefault();
      setLocalError("Falta escolher o sexo biológico (lá em cima, em \"Seus dados\").");
      return;
    }
    setLocalError(null);
  }

  const Req = () => <span className="text-orange"> *</span>;

  if (state.success) {
    return (
      <Card className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold text-navy">Cadastro recebido! 🎉</h1>
        {state.success.emailSent ? (
          <p className="text-sm text-navy">
            Mandamos seu acesso pro e-mail <strong>{state.success.email}</strong> (confere também a
            caixa de spam). Guardamos aqui embaixo também, por garantia:
          </p>
        ) : (
          <p className="text-sm text-navy">
            Não conseguimos mandar o e-mail agora, mas seu acesso já está pronto — guarda essas
            informações:
          </p>
        )}
        <AccessCredentialsCard
          email={state.success.email}
          password={state.success.password}
          title="Seu acesso ao app:"
        />
        <div className="rounded-lg bg-lightblue/10 p-3 text-sm text-navy">
          <p className="mb-1.5 font-semibold">📲 Deixe o app na tela do celular:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Android</strong> (Chrome): toque nos três pontinhos <strong>⋮</strong> no
              canto e escolha <strong>"Adicionar à tela inicial"</strong> (ou "Instalar app").
            </li>
            <li>
              <strong>iPhone</strong> (Safari): toque no botão de compartilhar{" "}
              <strong>⬆️</strong> na barra de baixo e escolha{" "}
              <strong>"Adicionar à Tela de Início"</strong>.
            </li>
          </ul>
        </div>
      </Card>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
      <input type="hidden" name="anamnesis" value={JSON.stringify(anamnese)} />
      <input type="hidden" name="service_type" value={serviceType} />

      <div>
        <h1 className="text-2xl font-bold text-navy">Cadastro de aluno</h1>
        <p className="text-blue">
          Preencha seus dados pra gente montar seu treino com segurança. Ao final, você recebe o
          acesso ao app por e-mail. Campos com <span className="font-semibold text-orange">*</span>{" "}
          são obrigatórios.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Seus dados</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Nome
            <Req />
          </label>
          <input
            name="name"
            required
            value={dados.name}
            onChange={(e) => setD("name", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            E-mail
            <Req />
          </label>
          <input
            name="email"
            type="email"
            required
            value={dados.email}
            onChange={(e) => setD("email", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
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
            Data de nascimento
            <Req />
          </label>
          <input
            name="birth_date"
            type="date"
            required
            value={dados.birth_date}
            onChange={(e) => setD("birth_date", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Sexo biológico
            <Req />
          </label>
          <SexPicker value={sex} onChange={setSex} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Altura (cm) <span className="font-normal text-blue">(opcional)</span>
            </label>
            <input
              name="height_cm"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={dados.height_cm}
              onChange={(e) => setD("height_cm", e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Peso (kg) <span className="font-normal text-blue">(opcional)</span>
            </label>
            <input
              name="weight_kg"
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={dados.weight_kg}
              onChange={(e) => setD("weight_kg", e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Você se considera iniciante, intermediário ou avançado?
          </label>
          <LevelPicker value={level} onChange={setLevel} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Objetivo</label>
          <GoalPicker value={goal} onChange={setGoal} placeholder="Emagrecimento, hipertrofia..." />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Saúde</h2>
        <YesNoField
          label="Possui alguma doença diagnosticada?"
          value={anamnese.possui_doenca}
          onChange={(v) => set("possui_doenca", v)}
          detailLabel="Qual?"
          detailValue={anamnese.qual_doenca}
          onDetailChange={(v) => set("qual_doenca", v)}
        />
        <YesNoField
          label="Toma algum medicamento regularmente?"
          value={anamnese.toma_medicamento}
          onChange={(v) => set("toma_medicamento", v)}
          detailLabel="Qual?"
          detailValue={anamnese.qual_medicamento}
          onDetailChange={(v) => set("qual_medicamento", v)}
        />
        <YesNoField
          label="Já fez alguma cirurgia?"
          value={anamnese.fez_cirurgia}
          onChange={(v) => set("fez_cirurgia", v)}
          detailLabel="Qual?"
          detailValue={anamnese.qual_cirurgia}
          onDetailChange={(v) => set("qual_cirurgia", v)}
        />
        <YesNoField
          label="Sente alguma dor ou tem alguma lesão?"
          value={anamnese.tem_dor_lesao}
          onChange={(v) => set("tem_dor_lesao", v)}
          detailLabel="Onde/qual?"
          detailValue={anamnese.qual_dor_lesao}
          onDetailChange={(v) => set("qual_dor_lesao", v)}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Hábitos</h2>
        <YesNoField
          label="Já praticou atividade física antes?"
          value={anamnese.pratica_atividade}
          onChange={(v) => set("pratica_atividade", v)}
          detailLabel="Qual modalidade?"
          detailValue={anamnese.qual_atividade}
          onDetailChange={(v) => set("qual_atividade", v)}
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-navy">Treina musculação atualmente?</label>
            <div className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => set("treina_atualmente", true)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  anamnese.treina_atualmente ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => set("treina_atualmente", false)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  !anamnese.treina_atualmente ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
                }`}
              >
                Não
              </button>
            </div>
          </div>
          {anamnese.treina_atualmente ? (
            <div className="mt-2 space-y-2">
              <input
                value={anamnese.tempo_treino}
                onChange={(e) => set("tempo_treino", e.target.value)}
                placeholder="Há quanto tempo treina? (ex: 8 meses)"
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
              />
              <select
                value={anamnese.frequencia_atual}
                onChange={(e) => set("frequencia_atual", e.target.value)}
                className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
              >
                <option value="">Quantas vezes por semana treina hoje?</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}x por semana
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              value={anamnese.tempo_parado}
              onChange={(e) => set("tempo_parado", e.target.value)}
              placeholder="Há quanto tempo está parado? (ex: 1 ano, ou 'nunca treinei')"
              className="mt-2 w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Quantas vezes por semana pretende treinar?
          </label>
          <select
            value={anamnese.frequencia_desejada}
            onChange={(e) => set("frequencia_desejada", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="">Selecione</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={String(n)}>
                {n}x por semana
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Quantos dias por semana você tem disponível pra treinar?
          </label>
          <select
            value={anamnese.dias_disponiveis}
            onChange={(e) => set("dias_disponiveis", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="">Selecione</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={String(n)}>
                {n} dia{n > 1 ? "s" : ""} por semana
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Quanto tempo você tem disponível por treino?
          </label>
          <select
            value={anamnese.tempo_disponivel}
            onChange={(e) => set("tempo_disponivel", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="">Selecione</option>
            <option value="30 minutos">Até 30 minutos</option>
            <option value="45 minutos">45 minutos</option>
            <option value="1 hora">1 hora</option>
            <option value="1h30">1h30</option>
            <option value="2 horas ou mais">2 horas ou mais</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-navy">Fumante?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("fumante", true)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                anamnese.fumante ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => set("fumante", false)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                !anamnese.fumante ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Não
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-navy">Consome álcool?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("consome_alcool", true)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                anamnese.consome_alcool ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => set("consome_alcool", false)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                !anamnese.consome_alcool ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Não
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Qualidade do sono</label>
          <select
            value={anamnese.qualidade_sono}
            onChange={(e) => set("qualidade_sono", e.target.value)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="Boa">Boa</option>
            <option value="Regular">Regular</option>
            <option value="Ruim">Ruim</option>
          </select>
        </div>
      </Card>

      <Card className="space-y-2">
        <label className="block text-sm font-medium text-navy">
          Conte tudo pra mim: o que você busca com{" "}
          {serviceType === "personal" ? "o personal" : "a assessoria"}?
        </label>
        <textarea
          value={anamnese.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={3}
          placeholder="Ex: emagrecer, ganhar força, melhorar a saúde, se preparar pra uma prova física..."
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
        />
      </Card>

      {(localError || state.error) && (
        <p className="rounded-lg bg-orange/10 px-3 py-2 text-sm font-medium text-orange">
          {localError ?? state.error}
        </p>
      )}

      {/* cada resposta de erro do servidor renova o token do "não sou robô" —
          state é um objeto novo a cada tentativa, então o sinal sempre muda */}
      <TurnstileWidget resetSignal={state.error ? state : null} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Concluir cadastro"}
      </Button>
    </form>
  );
}
