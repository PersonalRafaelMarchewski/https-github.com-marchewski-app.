"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import StudentButton from "@/components/student/StudentButton";
import StudentCard from "@/components/student/StudentCard";

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
  fumante: boolean;
  consome_alcool: boolean;
  qualidade_sono: string;
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
  pratica_atividade: false,
  qual_atividade: "",
  treina_atualmente: false,
  tempo_treino: "",
  tempo_parado: "",
  frequencia_atual: "",
  frequencia_desejada: "",
  fumante: false,
  consome_alcool: false,
  qualidade_sono: "Boa",
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-navy">{label}</label>
        <div className="flex gap-2">
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
      </StudentCard>

      <StudentCard className="space-y-4">
        <h2 className="font-heading font-semibold text-navy">Hábitos</h2>
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

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-navy">Fumante?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("fumante", true)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                data.fumante ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => set("fumante", false)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                !data.fumante ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
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
                data.consome_alcool ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => set("consome_alcool", false)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                !data.consome_alcool ? "bg-orange text-white" : "bg-lightblue/20 text-navy"
              }`}
            >
              Não
            </button>
          </div>
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
      </StudentCard>

      <StudentCard className="space-y-2">
        <label className="block text-sm font-medium text-navy">Observações gerais</label>
        <textarea
          value={data.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-lightblue/50 px-3 py-2 outline-none focus:border-orange"
        />
      </StudentCard>

      {error && <p className="text-sm text-orange">{error}</p>}
      {saved && <p className="text-sm text-blue">Anamnese salva com sucesso.</p>}

      <StudentButton type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Salvar anamnese"}
      </StudentButton>
    </form>
  );
}
