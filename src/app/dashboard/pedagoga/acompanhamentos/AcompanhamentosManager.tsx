"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, FileWarning, Sparkles, Trash2 } from "lucide-react";
import { followUpSchema, type FollowUpInput } from "@/validations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput, FormTextarea } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { formatDate, humanizeEnum } from "@/lib/utils";
import { createFollowUp, updateFollowUpStatus, deleteFollowUp, registerOccurrence } from "./actions";

interface Student { id: string; name: string; className: string }
interface FollowUp { id: string; student: string; title: string; notes: string; plan: string | null; status: string; createdAt: string }
interface Occurrence { id: string; student: string; type: string; severity: string; description: string; date: string }

const STATUSES = ["ABERTO", "EM_ANDAMENTO", "CONCLUIDO"];
const OCC_TYPES = ["COMPORTAMENTO", "ATRASO", "FALTA_GRAVE", "ELOGIO", "SAUDE", "OUTRO"];
const SEVERITIES = ["BAIXA", "MEDIA", "ALTA"];

function statusTone(s: string) {
  return s === "CONCLUIDO" ? "emerald" : s === "EM_ANDAMENTO" ? "amber" : "slate";
}

export function AcompanhamentosManager({
  students,
  followUps,
  occurrences,
}: {
  students: Student[];
  followUps: FollowUp[];
  occurrences: Occurrence[];
}) {
  const router = useRouter();

  // ----- Acompanhamento (RHF) -----
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FollowUpInput>({ resolver: zodResolver(followUpSchema), defaultValues: { status: "ABERTO" } });
  const [followError, setFollowError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const watchedStudent = watch("studentId");

  async function onCreate(values: FollowUpInput) {
    setFollowError(null);
    const res = await createFollowUp(values);
    if (!res.ok) return setFollowError(res.error);
    reset({ studentId: "", title: "", notes: "", plan: "", status: "ABERTO" });
    router.refresh();
  }

  async function generatePlan() {
    if (!watchedStudent) {
      setFollowError("Selecione um aluno para gerar o plano com IA.");
      return;
    }
    setAiLoading(true);
    setFollowError(null);
    try {
      const res = await fetch("/api/ai/pedagogue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Crie um plano de apoio pedagógico detalhado, com objetivos, ações e prazos, para este aluno.", studentId: watchedStudent }),
      });
      const data = await res.json();
      if (data.ok) setValue("plan", data.answer);
      else setFollowError(data.error || "Falha ao gerar plano.");
    } catch {
      setFollowError("Erro ao consultar a IA.");
    } finally {
      setAiLoading(false);
    }
  }

  // ----- Ocorrência (useState) -----
  const [pending, startTransition] = useTransition();
  const [occStudent, setOccStudent] = useState("");
  const [occType, setOccType] = useState("COMPORTAMENTO");
  const [occSeverity, setOccSeverity] = useState("MEDIA");
  const [occDesc, setOccDesc] = useState("");
  const [occFeedback, setOccFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  function submitOccurrence() {
    setOccFeedback(null);
    startTransition(async () => {
      const res = await registerOccurrence({ studentId: occStudent, type: occType, severity: occSeverity, description: occDesc });
      if (!res.ok) setOccFeedback({ type: "err", msg: res.error });
      else {
        setOccFeedback({ type: "ok", msg: res.message ?? "Registrada." });
        setOccDesc("");
        router.refresh();
      }
    });
  }

  const studentOptions = students.map((s) => ({ value: s.id, label: `${s.name} — ${s.className}` }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form acompanhamento */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Novo acompanhamento pedagógico</h3>
          </div>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <SelectInput label="Aluno" placeholder="Selecione" options={studentOptions} error={errors.studentId?.message} {...register("studentId")} />
            <FormInput label="Título" placeholder="Ex: Plano de recuperação" error={errors.title?.message} {...register("title")} />
            <FormTextarea label="Observações" error={errors.notes?.message} {...register("notes")} />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Plano de apoio</label>
                <button type="button" onClick={generatePlan} disabled={aiLoading} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                  <Sparkles className="h-3.5 w-3.5" /> {aiLoading ? "Gerando..." : "Gerar com IA"}
                </button>
              </div>
              <FormTextarea error={errors.plan?.message} {...register("plan")} />
            </div>
            <SelectInput label="Status" options={STATUSES.map((s) => ({ value: s, label: humanizeEnum(s) }))} {...register("status")} />
            {followError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{followError}</p>}
            <Button type="submit" loading={isSubmitting}>Registrar acompanhamento</Button>
          </form>
        </div>

        {/* Form ocorrência */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Registrar ocorrência</h3>
          </div>
          <div className="space-y-4">
            <SelectInput label="Aluno" placeholder="Selecione" value={occStudent} onChange={(e) => setOccStudent(e.target.value)} options={studentOptions} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Tipo" value={occType} onChange={(e) => setOccType(e.target.value)} options={OCC_TYPES.map((t) => ({ value: t, label: humanizeEnum(t) }))} />
              <SelectInput label="Gravidade" value={occSeverity} onChange={(e) => setOccSeverity(e.target.value)} options={SEVERITIES.map((s) => ({ value: s, label: humanizeEnum(s) }))} />
            </div>
            <FormTextarea label="Descrição" value={occDesc} onChange={(e) => setOccDesc(e.target.value)} />
            {occFeedback && <p className={`text-sm ${occFeedback.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>{occFeedback.msg}</p>}
            <Button variant="secondary" onClick={submitOccurrence} loading={pending} disabled={!occStudent || !occDesc}>Registrar ocorrência</Button>
          </div>
        </div>
      </div>

      {/* Listas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Acompanhamentos</h3>
          <ul className="space-y-3">
            {followUps.length === 0 && <li className="text-sm text-slate-400">Nenhum acompanhamento registrado.</li>}
            {followUps.map((f) => (
              <li key={f.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{f.student}</p>
                  <Badge tone={statusTone(f.status)}>{humanizeEnum(f.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.title}</p>
                <p className="mt-1 text-xs text-slate-400">{f.notes}</p>
                {f.plan && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-white/5">{f.plan}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatDate(f.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={f.status}
                      onChange={(e) => updateFollowUpStatus(f.id, e.target.value).then(() => router.refresh())}
                      className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-white/10"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{humanizeEnum(s)}</option>)}
                    </select>
                    <button onClick={() => { if (confirm("Remover?")) deleteFollowUp(f.id).then(() => router.refresh()); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Ocorrências recentes</h3>
          <ul className="space-y-2">
            {occurrences.length === 0 && <li className="text-sm text-slate-400">Nenhuma ocorrência.</li>}
            {occurrences.map((o) => (
              <li key={o.id} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{o.student}</p>
                  <Badge tone={o.severity === "ALTA" ? "red" : o.severity === "MEDIA" ? "amber" : "slate"}>{humanizeEnum(o.type)}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.description}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(o.date)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
