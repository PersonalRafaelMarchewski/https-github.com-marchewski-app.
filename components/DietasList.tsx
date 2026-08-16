"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { normalizeSearch } from "@/lib/text";

type Row = {
  id: string;
  studentName: string;
  avatarSignedUrl: string | null;
  plan: { id: string; name: string; status: string } | null;
};

export default function DietasList({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = normalizeSearch(search.trim());

  const filtered = rows.filter(
    (r) => !normalizedSearch || normalizeSearch(r.studentName).includes(normalizedSearch)
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar aluno pelo nome..."
          className="w-full rounded-lg border border-lightblue/50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center text-blue">
          {normalizedSearch ? "Nenhum aluno encontrado com esse nome." : "Nenhum aluno ativo ainda."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <Card key={row.id} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full bg-peach/40 text-navy">
                  {row.avatarSignedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatarSignedUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy">{row.studentName}</p>
                  <p className="text-sm text-blue">
                    {row.plan
                      ? `${row.plan.name}${row.plan.status === "inactive" ? " (inativo)" : ""}`
                      : "Nenhum plano ainda"}
                  </p>
                </div>
              </div>
              {row.plan ? (
                <div className="flex flex-none gap-2">
                  <Link href={`/dietas/${row.plan.id}/recordatorio`}>
                    <Button variant="secondary">Recordatório</Button>
                  </Link>
                  <Link href={`/dietas/${row.plan.id}/editar`}>
                    <Button variant="secondary">Editar</Button>
                  </Link>
                </div>
              ) : (
                <Link href={`/dietas/novo?student=${row.id}`} className="flex-none">
                  <Button variant="secondary">Criar</Button>
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
