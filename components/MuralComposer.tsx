"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Link2 } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { createMuralPost } from "@/app/(trainer)/mural/actions";

type StudentOption = { id: string; name: string };

const AUDIENCES = [
  { value: "all", label: "Todos os alunos" },
  { value: "personal", label: "Só Personal" },
  { value: "assessoria", label: "Só Assessoria" },
  { value: "student", label: "Um aluno específico" },
] as const;

// Formulário de publicar no mural: público (todos / personal / assessoria
// / um aluno), mensagem, link opcional (blog/Instagram) e o checkbox de
// notificação — marcado por padrão, porque recado que importa tem que
// vibrar no bolso; desmarca só nos corriqueiros.
export default function MuralComposer({ students }: { students: StudentOption[] }) {
  const router = useRouter();
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("all");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  async function handlePublish() {
    setSaving(true);
    setError(null);
    setPublished(false);
    try {
      await createMuralPost({
        audience,
        studentId: audience === "student" ? studentId || null : null,
        title,
        body,
        linkUrl,
        notify,
      });
      setTitle("");
      setBody("");
      setLinkUrl("");
      setPublished(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="flex-none text-orange" />
        <h2 className="font-heading font-semibold text-navy">Novo recado</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy">Pra quem</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as any)}
            className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {audience === "student" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">Aluno</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
            >
              <option value="">Escolher...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-navy">
          Título <span className="font-normal text-blue">(opcional)</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Bora começar a semana! 🔥"
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-navy">Mensagem</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Escreve o recado..."
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      </div>

      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-navy">
          <Link2 size={14} className="text-blue" />
          Link <span className="font-normal text-blue">(opcional — blog, Instagram...)</span>
        </label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          inputMode="url"
          className="w-full rounded-lg border border-lightblue/50 px-3 py-2 text-sm outline-none focus:border-orange"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="h-4 w-4 rounded border-lightblue/50 accent-orange"
        />
        Enviar notificação no celular de quem vai receber
      </label>

      {error && <p className="text-sm text-orange">{error}</p>}
      {published && (
        <p className="text-sm text-navy">Publicado! Já está no mural de quem você escolheu.</p>
      )}

      <Button type="button" onClick={handlePublish} disabled={saving}>
        {saving ? "Publicando..." : "Publicar"}
      </Button>
    </Card>
  );
}
