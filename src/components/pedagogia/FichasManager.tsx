"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText, Mail, Phone, Plus, Trash2, UserRound } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormTextarea } from "@/components/forms/FormInput";
import { useToast } from "@/components/providers/ToastProvider";
import { SUPPORT_NEED_LABELS } from "@/lib/support-labels";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import {
  createSupportNeed,
  deleteSupportNeed,
  createDevelopmentNote,
  deleteDevelopmentNote,
} from "@/lib/student-support-actions";

export interface Ficha {
  id: string;
  name: string;
  registration: string;
  className: string | null;
  guardian: { name: string; email: string; phone: string | null } | null;
  needs: {
    id: string;
    type: string;
    description: string;
    observations: string | null;
    documentUrl: string | null;
    active: boolean;
    author: string;
    createdAt: string;
  }[];
  notes: { id: string; content: string; author: string; role: string; createdAt: string }[];
}

const NEED_TYPES = Object.keys(SUPPORT_NEED_LABELS);

export function FichasManager({
  fichas,
  canManageSupport,
  canAddNote,
  showContact,
}: {
  fichas: Ficha[];
  canManageSupport: boolean;
  canAddNote: boolean;
  showContact: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // formulários controlados dentro do modal
  const [needType, setNeedType] = useState("TDAH");
  const [needDesc, setNeedDesc] = useState("");
  const [needObs, setNeedObs] = useState("");
  const [needDoc, setNeedDoc] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return fichas;
    return fichas.filter((f) => `${f.name} ${f.registration} ${f.className ?? ""}`.toLowerCase().includes(q));
  }, [fichas, query]);

  const selected = fichas.find((f) => f.id === openId) ?? null;

  function run(action: Promise<{ ok: boolean; error?: string; message?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const res = await action;
      showToast({ tone: res.ok ? "success" : "error", title: res.ok ? (res.message ?? "Feito.") : (res.error ?? "Erro.") });
      if (res.ok) {
        onOk?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar aluno por nome, matrícula ou turma..."
        className="input-base sm:max-w-md"
      />

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">Nenhum aluno encontrado.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => setOpenId(f.id)}
              className="card p-4 text-left transition hover:shadow-glow"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800 dark:text-white">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.className ?? "Sem turma"} · {f.registration}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.needs.filter((n) => n.active).length === 0 ? (
                  <span className="text-xs text-slate-400">Sem laudo registrado</span>
                ) : (
                  f.needs
                    .filter((n) => n.active)
                    .map((n) => (
                      <Badge key={n.id} tone="violet">
                        {SUPPORT_NEED_LABELS[n.type] ?? n.type}
                      </Badge>
                    ))
                )}
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <ClipboardList className="h-3.5 w-3.5" /> {f.notes.length} anotação(ões)
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setOpenId(null)}
        title={selected?.name}
        description={selected ? `${selected.className ?? "Sem turma"} · Matrícula ${selected.registration}` : undefined}
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Contato do responsável */}
            {showContact && selected.guardian && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Responsável</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selected.guardian.name}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" /> {selected.guardian.email}</p>
                {selected.guardian.phone && (
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" /> {selected.guardian.phone}</p>
                )}
              </div>
            )}

            {/* Laudos / necessidades */}
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <FileText className="h-4 w-4 text-violet-500" /> Laudos e necessidades
              </h3>
              <ul className="space-y-2">
                {selected.needs.length === 0 && <li className="text-sm text-slate-400">Nenhum laudo registrado.</li>}
                {selected.needs.map((n) => (
                  <li key={n.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={n.active ? "violet" : "slate"}>{SUPPORT_NEED_LABELS[n.type] ?? n.type}</Badge>
                      {canManageSupport && (
                        <button onClick={() => run(deleteSupportNeed(n.id))} disabled={pending} className="text-slate-400 hover:text-red-500" aria-label="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{n.description}</p>
                    {n.observations && <p className="mt-1 text-xs text-slate-500">Apoio: {n.observations}</p>}
                    {n.documentUrl && (
                      <a href={n.documentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
                        Ver documento
                      </a>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">Registrado por {n.author}</p>
                  </li>
                ))}
              </ul>

              {canManageSupport && (
                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Registrar laudo/necessidade</p>
                  <select value={needType} onChange={(e) => setNeedType(e.target.value)} className="input-base h-9 text-sm">
                    {NEED_TYPES.map((t) => (
                      <option key={t} value={t}>{SUPPORT_NEED_LABELS[t]}</option>
                    ))}
                  </select>
                  <FormTextarea placeholder="Descrição do laudo/necessidade" value={needDesc} onChange={(e) => setNeedDesc(e.target.value)} />
                  <input className="input-base" placeholder="Recomendações de apoio (opcional)" value={needObs} onChange={(e) => setNeedObs(e.target.value)} />
                  <input className="input-base" placeholder="Link do documento/laudo (opcional)" value={needDoc} onChange={(e) => setNeedDoc(e.target.value)} />
                  <Button
                    size="sm"
                    loading={pending}
                    disabled={needDesc.trim().length < 3}
                    onClick={() =>
                      run(
                        createSupportNeed({ studentId: selected.id, type: needType, description: needDesc, observations: needObs, documentUrl: needDoc, active: true }),
                        () => { setNeedDesc(""); setNeedObs(""); setNeedDoc(""); },
                      )
                    }
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
              )}
            </section>

            {/* Anotações de desenvolvimento */}
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ClipboardList className="h-4 w-4 text-emerald-500" /> Anotações de desenvolvimento
              </h3>
              <ul className="space-y-2">
                {selected.notes.length === 0 && <li className="text-sm text-slate-400">Nenhuma anotação ainda.</li>}
                {selected.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="emerald">{ROLE_LABELS[n.role as Role] ?? n.role}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                        <button onClick={() => run(deleteDevelopmentNote(n.id))} disabled={pending} className="text-slate-400 hover:text-red-500" aria-label="Remover">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{n.content}</p>
                    <p className="mt-1 text-[11px] text-slate-400">— {n.author}</p>
                  </li>
                ))}
              </ul>

              {canAddNote && (
                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <FormTextarea placeholder="Escreva uma anotação sobre o desenvolvimento do aluno..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                  <Button
                    size="sm"
                    loading={pending}
                    disabled={noteContent.trim().length < 3}
                    onClick={() => run(createDevelopmentNote({ studentId: selected.id, content: noteContent }), () => setNoteContent(""))}
                  >
                    <Plus className="h-4 w-4" /> Adicionar anotação
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
