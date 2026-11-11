import StudentCard from "@/components/student/StudentCard";
import { CIRCUMFERENCE_FIELDS, SKINFOLD_FIELDS } from "@/lib/evaluationFields";
import { formatDateLongBR } from "@/lib/date";

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-lightblue/10 px-4 py-3 text-center">
      <p className="font-heading text-xl font-bold text-navy">
        {value}
        {unit && <span className="text-sm font-medium text-blue"> {unit}</span>}
      </p>
      <p className="mt-0.5 text-xs text-blue">{label}</p>
    </div>
  );
}

function MeasurementGrid({
  title,
  fields,
  measurements,
}: {
  title: string;
  fields: { key: string; label: string; unit: string }[];
  measurements: Record<string, number>;
}) {
  const entries = fields.filter((f) => typeof measurements[f.key] === "number");
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-navy">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {entries.map((f) => (
          <div key={f.key} className="rounded-xl border border-lightblue/20 px-3 py-2">
            <p className="text-sm font-medium text-navy">
              {measurements[f.key]}
              <span className="text-xs text-blue"> {f.unit}</span>
            </p>
            <p className="text-xs text-blue">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationDetail({
  date,
  weight,
  height,
  bodyFat,
  measurements,
  notes,
  nextAssessmentDate,
  photoUrls = [],
  bioimpedanceUrl = null,
}: {
  date: string;
  weight: number | null;
  height: number | null;
  bodyFat: number | null;
  measurements: Record<string, number> | null;
  notes: string | null;
  nextAssessmentDate?: string | null;
  photoUrls?: string[];
  bioimpedanceUrl?: string | null;
}) {
  const m = measurements ?? {};
  const bmi = weight && height ? weight / (height / 100) ** 2 : null;

  const stats: { label: string; value: string; unit?: string }[] = [];
  if (weight != null) stats.push({ label: "Peso", value: String(weight), unit: "kg" });
  if (height != null) stats.push({ label: "Altura", value: String(height), unit: "cm" });
  if (bmi != null) stats.push({ label: "IMC", value: bmi.toFixed(1) });
  if (bodyFat != null) stats.push({ label: "% Gordura", value: String(bodyFat), unit: "%" });

  return (
    <div className="space-y-4">
      <StudentCard>
        <p className="font-heading font-semibold text-navy">{formatDateLongBR(date)}</p>
        {stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>
        )}
      </StudentCard>

      {(CIRCUMFERENCE_FIELDS.some((f) => typeof m[f.key] === "number") ||
        SKINFOLD_FIELDS.some((f) => typeof m[f.key] === "number")) && (
        <StudentCard className="space-y-4">
          <MeasurementGrid title="Circunferências" fields={CIRCUMFERENCE_FIELDS} measurements={m} />
          <MeasurementGrid title="Dobras cutâneas" fields={SKINFOLD_FIELDS} measurements={m} />
        </StudentCard>
      )}

      {photoUrls.length > 0 && (
        <StudentCard>
          <p className="mb-2 text-sm font-semibold text-navy">Fotos</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                className="aspect-square w-full rounded-xl border border-lightblue/30 object-cover"
              />
            ))}
          </div>
        </StudentCard>
      )}

      {bioimpedanceUrl && (
        <StudentCard>
          <a
            href={bioimpedanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-lightblue/15 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-lightblue/25"
          >
            📎 Ver laudo de bioimpedância
          </a>
        </StudentCard>
      )}

      {notes && (
        <StudentCard>
          <p className="mb-1 text-sm font-semibold text-navy">Observações do seu personal</p>
          <p className="whitespace-pre-line text-sm text-navy">{notes}</p>
        </StudentCard>
      )}

      {nextAssessmentDate && (
        <StudentCard className="text-sm text-blue">
          Próxima avaliação prevista: <strong>{formatDateLongBR(nextAssessmentDate)}</strong>
        </StudentCard>
      )}
    </div>
  );
}
