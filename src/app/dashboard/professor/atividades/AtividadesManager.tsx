"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Megaphone, Paperclip, Plus, Sparkles, Trash2, X } from "lucide-react";
import { activitySchema, type ActivityInput } from "@/validations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput, FormTextarea } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { formatDate, humanizeEnum } from "@/lib/utils";
import { ATTACHMENT_TYPE_LABELS } from "@/lib/support-labels";
import { createActivity, createAnnouncement } from "../actions";

interface Assignment { classId: string; className: string; subjectId: string; subjectName: string }
interface Attachment { id: string; type: string; title: string | null; url: string }
interface ActivityRow {
  id: string;
  title: string;
  type: string;
  className: string;
  subject: string | null;
  dueDate: string | null;
  adapted: boolean;
  attachments: Attachment[];
}

const TYPES = ["TAREFA", "PROVA", "TRABALHO", "RECUPERACAO", "PLANO_AULA"];
const AUDIENCES = ["TODOS", "TURMA", "ALUNOS", "RESPONSAVEIS"];
const ATTACH_TYPES = ["LINK", "IMAGE", "VIDEO", "PDF"];

export function AtividadesManager({
  assignments,
  activities,
}: {
  assignments: Assignment[];
  activities: ActivityRow[];
}) {
  const router = useRouter();
  const classes = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => map.set(a.classId, a.className));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [assignments]);

  // ----- Atividade (RHF) -----
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityInput>({ resolver: zodResolver(activitySchema), defaultValues: { type: "TAREFA", adapted: false } });
  const [activityError, setActivityError] = useState<string | null>(null);
  const selectedClass = watch("classId");
  const isAdapted = watch("adapted");
  const subjectsForClass = assignments.filter((a) => a.classId === selectedClass);

  // Anexos (link/imagem/vídeo/pdf) — gerenciados fora do RHF
  const [attachments, setAttachments] = useState<{ type: string; title: string; url: string }[]>([]);
  const [attType, setAttType] = useState("LINK");
  const [attTitle, setAttTitle] = useState("");
  const [attUrl, setAttUrl] = useState("");

  function addAttachment() {
    if (!attUrl.trim()) return;
    setAttachments((prev) => [...prev, { type: attType, title: attTitle.trim(), url: attUrl.trim() }]);
    setAttTitle("");
    setAttUrl("");
    setAttType("LINK");
  }

  async function onCreateActivity(values: ActivityInput) {
    setActivityError(null);
    const res = await createActivity({ ...values, attachments });
    if (!res.ok) return setActivityError(res.error);
    reset({ title: "", description: "", type: "TAREFA", dueDate: "", classId: "", subjectId: "", adapted: false, adaptationNotes: "" });
    setAttachments([]);
    router.refresh();
  }

  // ----- Comunicado (simples) -----
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("TODOS");
  const [annClass, setAnnClass] = useState("");
  const [annFeedback, setAnnFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  function publishAnnouncement() {
    setAnnFeedback(null);
    startTransition(async () => {
      const res = await createAnnouncement({ title, content, audience, classId: annClass });
      if (!res.ok) setAnnFeedback({ type: "err", msg: res.error });
      else {
        setAnnFeedback({ type: "ok", msg: res.message ?? "Publicado." });
        setTitle("");
        setContent("");
        router.refresh();
      }
    });
  }

  if (assignments.length === 0) {
    return <div className="card p-8 text-center text-slate-500">Você ainda não possui turmas vinculadas.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Criar atividade */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-500" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Nova atividade</h3>
        </div>
        <form onSubmit={handleSubmit(onCreateActivity)} className="space-y-4">
          <FormInput label="Título" error={errors.title?.message} {...register("title")} />
          <FormTextarea label="Descrição" error={errors.description?.message} {...register("description")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Tipo" options={TYPES.map((t) => ({ value: t, label: humanizeEnum(t) }))} error={errors.type?.message} {...register("type")} />
            <FormInput label="Data de entrega" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Turma" placeholder="Selecione" options={classes.map((c) => ({ value: c.id, label: c.name }))} error={errors.classId?.message} {...register("classId")} />
            <SelectInput label="Disciplina" placeholder="Opcional" options={subjectsForClass.map((s) => ({ value: s.subjectId, label: s.subjectName }))} error={errors.subjectId?.message} {...register("subjectId")} />
          </div>

          {/* Anexos */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Paperclip className="h-4 w-4" /> Anexos e links (imagem, vídeo, PDF ou link)
            </p>
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachments.map((a, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs dark:bg-white/5">
                    <span className="truncate text-slate-600 dark:text-slate-300">
                      <Badge tone="brand">{ATTACHMENT_TYPE_LABELS[a.type] ?? a.type}</Badge> {a.title || a.url}
                    </span>
                    <button type="button" onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
              <select value={attType} onChange={(e) => setAttType(e.target.value)} className="input-base h-9 text-sm">
                {ATTACH_TYPES.map((t) => <option key={t} value={t}>{ATTACHMENT_TYPE_LABELS[t]}</option>)}
              </select>
              <input value={attTitle} onChange={(e) => setAttTitle(e.target.value)} placeholder="Título (opcional)" className="input-base h-9 text-sm" />
            </div>
            <div className="mt-2 flex gap-2">
              <input value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="https://..." className="input-base h-9 text-sm" />
              <Button type="button" size="sm" variant="secondary" onClick={addAttachment} disabled={!attUrl.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Atividade adaptada */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("adapted")} />
              <Sparkles className="h-4 w-4 text-violet-500" /> Atividade adaptada (alunos com necessidades especiais)
            </label>
            {isAdapted && (
              <div className="mt-2">
                <FormTextarea placeholder="Descreva as adaptações (ex: tempo estendido, material ampliado, apoio de mediador)..." error={errors.adaptationNotes?.message} {...register("adaptationNotes")} />
              </div>
            )}
          </div>

          {activityError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{activityError}</p>}
          <Button type="submit" loading={isSubmitting}><Plus className="h-4 w-4" /> Criar atividade</Button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Atividades recentes</p>
          <ul className="space-y-2">
            {activities.length === 0 && <li className="text-sm text-slate-400">Nenhuma atividade criada.</li>}
            {activities.map((a) => (
              <li key={a.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {a.title}
                      {a.adapted && <Badge tone="violet">Adaptada</Badge>}
                    </p>
                    <p className="text-xs text-slate-400">{a.className} · {a.subject ?? "Geral"} · entrega {formatDate(a.dueDate)}</p>
                  </div>
                  <Badge tone="brand">{humanizeEnum(a.type)}</Badge>
                </div>
                {a.attachments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {a.attachments.map((at) => (
                      <a key={at.id} href={at.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] text-brand-600 ring-1 ring-slate-200 hover:underline dark:bg-white/10 dark:ring-white/10">
                        <Paperclip className="h-3 w-3" /> {at.title || ATTACHMENT_TYPE_LABELS[at.type] || "Anexo"}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comunicado */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-violet-500" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Comunicado para a turma</h3>
        </div>
        <div className="space-y-4">
          <FormInput label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <FormTextarea label="Mensagem" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Público" value={audience} onChange={(e) => setAudience(e.target.value)} options={AUDIENCES.map((a) => ({ value: a, label: humanizeEnum(a) }))} />
            <SelectInput label="Turma (opcional)" placeholder="Toda a escola" value={annClass} onChange={(e) => setAnnClass(e.target.value)} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          {annFeedback && <p className={`text-sm ${annFeedback.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>{annFeedback.msg}</p>}
          <Button variant="secondary" onClick={publishAnnouncement} loading={pending} disabled={!title || !content}>
            <Megaphone className="h-4 w-4" /> Publicar comunicado
          </Button>
        </div>
      </div>
    </div>
  );
}
