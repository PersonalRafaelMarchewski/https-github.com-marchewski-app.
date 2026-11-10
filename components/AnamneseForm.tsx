"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import StudentButton from "@/components/student/StudentButton";
import StudentCard from "@/components/student/StudentCard";

type Anamnese = {
  // Saúde
  possui_doenca: boolean;
  qual_doenca: string;
  toma_medicamento: boolean;
  qual_medicamento: string;
  fez_cirurgia: boolean;
  qual_cirurgia: string;
  tem_dor_lesao: boolean;
  qual_dor_lesao: string;
  problema_cardiaco: boolean;
  qual_problema_cardiaco: string;
  dor_peito_esforco: boolean;
  historico_familiar_cardiaco: boolean;
  qual_historico_familiar_cardiaco: string;
  gestante_pos_parto: boolean;
  detalhe_gestante_pos_parto: string;

  // Histórico e rotina de treino
  pratica_atividade: boolean;
  qual_atividade: string;
  treina_atualmente: boolean;
  tempo_treino: string;
  tempo_parado: string;
  frequencia_atual: string;
  frequencia_desejada: string;
  dias_disponiveis: string;
  tempo_disponivel: string;
  exercicios_favoritos: string;
  exercicios_evitar: string;

  // Estilo de vida
  fumante: boolean;
  consome_alcool: boolean;
  frequencia_alcool: string;
  qualidade_sono: string;
  horas_sono: string;
  nivel_estresse: string;
  rotina_trabalho: string;
  agua_litros_dia: string;

  // Alimentação
  refeicoes_por_dia: string;
  quem_prepara_refeicoes: string;
  possui_alergia_alimentar: boolean;
  qual_alergia_alimentar: string;
  possui_intolerancia_alimentar: boolean;
  qual_intolerancia_alimentar: string;
  segue_dieta_restricao: boolean;
  qual_dieta_restricao: string;
  alimentos_nao_gosta: string;
  alimentos_favoritos: string;
  come_fora_frequencia: string;
  belisca_entre_refeicoes: boolean;
  toma_suplemento: boolean;
  qual_suplemento: string;
  ja_fez_dieta_acompanhamento: boolean;
  apetite: string;

  // Objetivo
  objetivo_principal: string;
  observacoes: string;
};

const EMPTY: Anamnese = {
  possui_doenca: false,
  qual_doenca: "",
  toma_medicamento: false,
  qual_medicamento: "",
  fez_cirurgia: false,
  qual_cirurgia: "",
  tem_dor_lesao: false,
  qual_dor_lesao: "",
  problema_cardiaco: false,
  qual_problema_cardiaco: "",
  dor_peito_esforco: false,
  historico_familiar_cardiaco: false,
  qual_historico_familiar_cardiaco: "",
  gestante_pos_parto: false,
  detalhe_gestante_pos_parto: "",

  pratica_atividade: false,
  qual_atividade: "",
  treina_atualmente: false,
  tempo_treino: "",
  tempo_parado: "",
  frequencia_atual: "",
  frequencia_desejada: "",
  dias_disponiveis: "",
  tempo_disponivel: "",
  exercicios_favoritos: "",
  exercicios_evitar: "",

  fumante: false,
  consome_alcool: false,
  frequencia_alcool: "",
  qualidade_sono: "Boa",
  horas_sono: "",
  nivel_estresse: "",
  rotina_trabalho: "",
  agua_litros_dia: "",

  refeicoes_por_dia: "",
  quem_prepara_refeicoes: "",
  possui_alergia_alimentar: false,
  qual_alergia_alimentar: "",
  possui_intolerancia_alimentar: false,
  qual_intolerancia_alimentar: "",
  segue_dieta_restricao: false,
  qual_dieta_restricao: "",
  alimentos_nao_gosta: "",
  alimentos_favoritos: "",
  come_fora_frequencia: "",
  belisca_entre_refeicoes: false,
  toma_suplemento: false,
  qual_suplemento: "",
  ja_fez_dieta_acompanhamento: false,
  apetite: "",

  objetivo_principal: "",
  observacoes: "",
};

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
          className="mt-2 w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      )}
    </div>
  );
}

function BoolToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
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
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AnamneseForm({
  studentId,
  initialData,
}: {
  studentId: string;
  initialData: Partial<Anamnese> | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<Anamnese>({ ...EMPTY, ...initialData });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Anamnese>(key: K, value: Anamnese[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("students")
      .update({ anamnesis: data })
      .eq("id", studentId);

    setSaving(false);

    if (updateError) {
      setError("Não foi possível salvar a anamnese.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Saúde</h2>
        <YesNoField
          label="Possui alguma doença diagnosticada?"
          value={data.possui_doenca}
          onChange={(v) => set("possui_doenca", v)}
          detailLabel="Qual?"
          detailValue={data.qual_doenca}
          onDetailChange={(v) => set("qual_doenca", v)}
        />
        <YesNoField
          label="Toma algum medicamento regularmente?"
          value={data.toma_medicamento}
          onChange={(v) => set("toma_medicamento", v)}
          detailLabel="Qual?"
          detailValue={data.qual_medicamento}
          onDetailChange={(v) => set("qual_medicamento", v)}
        />
        <YesNoField
          label="Já fez alguma cirurgia?"
          value={data.fez_cirurgia}
          onChange={(v) => set("fez_cirurgia", v)}
          detailLabel="Qual?"
          detailValue={data.qual_cirurgia}
          onDetailChange={(v) => set("qual_cirurgia", v)}
        />
        <YesNoField
          label="Sente alguma dor ou tem alguma lesão?"
          value={data.tem_dor_lesao}
          onChange={(v) => set("tem_dor_lesao", v)}
          detailLabel="Onde/qual?"
          detailValue={data.qual_dor_lesao}
          onDetailChange={(v) => set("qual_dor_lesao", v)}
        />
        <YesNoField
          label="Já teve problema cardíaco ou tem pressão alta (hipertensão)?"
          value={data.problema_cardiaco}
          onChange={(v) => set("problema_cardiaco", v)}
          detailLabel="Qual/detalhe?"
          detailValue={data.qual_problema_cardiaco}
          onDetailChange={(v) => set("qual_problema_cardiaco", v)}
        />
        <BoolToggle
          label="Sente dor no peito, tontura ou falta de ar em repouso ou esforço leve?"
          value={data.dor_peito_esforco}
          onChange={(v) => set("dor_peito_esforco", v)}
        />
        <YesNoField
          label="Histórico familiar de problema cardíaco precoce (pai antes dos 55, mãe antes dos 65)?"
          value={data.historico_familiar_cardiaco}
          onChange={(v) => set("historico_familiar_cardiaco", v)}
          detailLabel="Quem/detalhe?"
          detailValue={data.qual_historico_familiar_cardiaco}
          onDetailChange={(v) => set("qual_historico_familiar_cardiaco", v)}
        />
        <YesNoField
          label="Está gestante ou em pós-parto?"
          value={data.gestante_pos_parto}
          onChange={(v) => set("gestante_pos_parto", v)}
          detailLabel="Quantas semanas/meses?"
          detailValue={data.detalhe_gestante_pos_parto}
          onDetailChange={(v) => set("detalhe_gestante_pos_parto", v)}
        />
      </StudentCard>

      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Histórico e rotina de treino</h2>
        <YesNoField
          label="Já praticou atividade física antes?"
          value={data.pratica_atividade}
          onChange={(v) => set("pratica_atividade", v)}
          detailLabel="Qual modalidade?"
          detailValue={data.qual_atividade}
          onDetailChange={(v) => set("qual_atividade", v)}
        />

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-navy">Treina musculação atualmente?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set("treina_atualmente", true)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  data.treina_atualmente ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => set("treina_atualmente", false)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  !data.treina_atualmente ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
                }`}
              >
                Não
              </button>
            </div>
          </div>
          {data.treina_atualmente ? (
            <div className="mt-2 space-y-2">
              <input
                value={data.tempo_treino}
                onChange={(e) => set("tempo_treino", e.target.value)}
                placeholder="Há quanto tempo treina? (ex: 8 meses)"
                className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
              />
              <select
                value={data.frequencia_atual}
                onChange={(e) => set("frequencia_atual", e.target.value)}
                className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
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
              value={data.tempo_parado}
              onChange={(e) => set("tempo_parado", e.target.value)}
              placeholder="Há quanto tempo está parado? (ex: 1 ano, ou 'nunca treinei')"
              className="mt-2 w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Quantas vezes por semana pretende treinar?
          </label>
          <select
            value={data.frequencia_desejada}
            onChange={(e) => set("frequencia_desejada", e.target.value)}
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
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
            value={data.dias_disponiveis}
            onChange={(e) => set("dias_disponiveis", e.target.value)}
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
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
            value={data.tempo_disponivel}
            onChange={(e) => set("tempo_disponivel", e.target.value)}
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="">Selecione</option>
            <option value="30 minutos">Até 30 minutos</option>
            <option value="45 minutos">45 minutos</option>
            <option value="1 hora">1 hora</option>
            <option value="1h30">1h30</option>
            <option value="2 horas ou mais">2 horas ou mais</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Tem algum exercício ou atividade que gosta mais de fazer?
          </label>
          <input
            value={data.exercicios_favoritos}
            onChange={(e) => set("exercicios_favoritos", e.target.value)}
            placeholder="Ex: agachamento, esteira, lutas..."
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Tem algum exercício que não gosta ou prefere evitar?
          </label>
          <input
            value={data.exercicios_evitar}
            onChange={(e) => set("exercicios_evitar", e.target.value)}
            placeholder="Ex: corrida, exercícios no chão..."
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>
      </StudentCard>

      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Estilo de vida</h2>
        <BoolToggle label="Fumante?" value={data.fumante} onChange={(v) => set("fumante", v)} />

        <div>
          <BoolToggle
            label="Consome álcool?"
            value={data.consome_alcool}
            onChange={(v) => set("consome_alcool", v)}
          />
          {data.consome_alcool && (
            <select
              value={data.frequencia_alcool}
              onChange={(e) => set("frequencia_alcool", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            >
              <option value="">Com que frequência?</option>
              <option value="Raramente">Raramente</option>
              <option value="1-2x por semana">1-2x por semana</option>
              <option value="3x ou mais por semana">3x ou mais por semana</option>
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Qualidade do sono</label>
          <select
            value={data.qualidade_sono}
            onChange={(e) => set("qualidade_sono", e.target.value)}
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          >
            <option value="Boa">Boa</option>
            <option value="Regular">Regular</option>
            <option value="Ruim">Ruim</option>
          </select>
        </div>

        <SelectField
          label="Quantas horas você dorme por noite, em média?"
          value={data.horas_sono}
          onChange={(v) => set("horas_sono", v)}
          options={["Menos de 5h", "5-6h", "7-8h", "Mais de 8h"]}
        />

        <SelectField
          label="Como você avalia seu nível de estresse no dia a dia?"
          value={data.nivel_estresse}
          onChange={(v) => set("nivel_estresse", v)}
          options={["Baixo", "Médio", "Alto"]}
        />

        <SelectField
          label="Sua rotina de trabalho/estudo é..."
          value={data.rotina_trabalho}
          onChange={(v) => set("rotina_trabalho", v)}
          options={["Sentado(a) a maior parte do dia", "Em pé/ativo(a) a maior parte do dia", "Mista"]}
        />

        <SelectField
          label="Quantos litros de água você bebe por dia, em média?"
          value={data.agua_litros_dia}
          onChange={(v) => set("agua_litros_dia", v)}
          options={["Menos de 1L", "1-2L", "2-3L", "Mais de 3L"]}
        />
      </StudentCard>

      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Alimentação</h2>

        <SelectField
          label="Quantas refeições você faz por dia, em média?"
          value={data.refeicoes_por_dia}
          onChange={(v) => set("refeicoes_por_dia", v)}
          options={["1-2", "3", "4", "5", "6 ou mais"]}
        />

        <SelectField
          label="Quem prepara suas refeições no dia a dia?"
          value={data.quem_prepara_refeicoes}
          onChange={(v) => set("quem_prepara_refeicoes", v)}
          options={[
            "Eu mesmo(a)",
            "Alguém da família",
            "Marmita/app de entrega",
            "Como fora na maioria das vezes",
          ]}
        />

        <YesNoField
          label="Possui alguma alergia alimentar?"
          value={data.possui_alergia_alimentar}
          onChange={(v) => set("possui_alergia_alimentar", v)}
          detailLabel="Qual?"
          detailValue={data.qual_alergia_alimentar}
          onDetailChange={(v) => set("qual_alergia_alimentar", v)}
        />

        <YesNoField
          label="Possui alguma intolerância alimentar (lactose, glúten, etc.)?"
          value={data.possui_intolerancia_alimentar}
          onChange={(v) => set("possui_intolerancia_alimentar", v)}
          detailLabel="Qual?"
          detailValue={data.qual_intolerancia_alimentar}
          onDetailChange={(v) => set("qual_intolerancia_alimentar", v)}
        />

        <YesNoField
          label="Segue alguma dieta ou restrição alimentar (vegetariano, vegano, religiosa, low carb...)?"
          value={data.segue_dieta_restricao}
          onChange={(v) => set("segue_dieta_restricao", v)}
          detailLabel="Qual?"
          detailValue={data.qual_dieta_restricao}
          onDetailChange={(v) => set("qual_dieta_restricao", v)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Tem algum alimento que não gosta ou não come de jeito nenhum?
          </label>
          <textarea
            value={data.alimentos_nao_gosta}
            onChange={(e) => set("alimentos_nao_gosta", e.target.value)}
            rows={2}
            placeholder="Ex: peixe, brócolis, fígado..."
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Quais alimentos você mais gosta / não pode faltar na sua dieta?
          </label>
          <textarea
            value={data.alimentos_favoritos}
            onChange={(e) => set("alimentos_favoritos", e.target.value)}
            rows={2}
            placeholder="Ex: arroz, frango, chocolate..."
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          />
        </div>

        <SelectField
          label="Com que frequência você come fora de casa?"
          value={data.come_fora_frequencia}
          onChange={(v) => set("come_fora_frequencia", v)}
          options={["Quase nunca", "1-2x por semana", "3-4x por semana", "Quase todo dia"]}
        />

        <BoolToggle
          label="Costuma beliscar ou sentir vontade de comer doces/salgados entre as refeições?"
          value={data.belisca_entre_refeicoes}
          onChange={(v) => set("belisca_entre_refeicoes", v)}
        />

        <YesNoField
          label="Toma algum suplemento atualmente (whey, creatina, etc.)?"
          value={data.toma_suplemento}
          onChange={(v) => set("toma_suplemento", v)}
          detailLabel="Qual?"
          detailValue={data.qual_suplemento}
          onDetailChange={(v) => set("qual_suplemento", v)}
        />

        <BoolToggle
          label="Já fez dieta com acompanhamento de nutricionista antes?"
          value={data.ja_fez_dieta_acompanhamento}
          onChange={(v) => set("ja_fez_dieta_acompanhamento", v)}
        />

        <SelectField
          label="Como você descreveria seu apetite?"
          value={data.apetite}
          onChange={(v) => set("apetite", v)}
          options={["Fraco", "Normal", "Forte/como muito"]}
        />
      </StudentCard>

      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Objetivo</h2>

        <SelectField
          label="Qual seu objetivo principal?"
          value={data.objetivo_principal}
          onChange={(v) => set("objetivo_principal", v)}
          options={[
            "Emagrecimento",
            "Hipertrofia / ganho de massa",
            "Condicionamento físico",
            "Saúde geral / qualidade de vida",
            "Performance esportiva",
            "Reabilitação / pós-lesão",
            "Outro",
          ]}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Conte tudo pra mim: o que você busca com a assessoria?
          </label>
          <textarea
            value={data.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={3}
            placeholder="Ex: emagrecer, ganhar força, melhorar a saúde, se preparar pra uma prova física..."
            className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
          />
        </div>
      </StudentCard>

      {error && <p className="text-sm text-orange">{error}</p>}
      {saved && <p className="text-sm text-blue">Anamnese salva com sucesso.</p>}

      <StudentButton type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Salvar anamnese"}
      </StudentButton>
    </form>
  );
}
