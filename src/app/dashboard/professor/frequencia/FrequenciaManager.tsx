"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectInput } from "@/components/forms/SelectInput";
import { FormInput } from "@/components/forms/FormInput";
import { useToast } from "@/components/providers/ToastProvider";
import { cn, currentYear } from "@/lib/utils";
import { saveAttendance } from "../actions";

interface Assignment { classId: string; className: string; subjectId: string; subjectName: string }
interface Student { id: string; name: string }

export function FrequenciaManager({
  assignments,
  studentsByClass,
}: {
  assignments: Assignment[];
  studentsByClass: Record<string, Student[]>;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => map.set(a.classId, a.className));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [assignments]);

  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [present, setPresent] = useState<Record<string, boolean>>({});

  const subjects = assignments.filter((a) => a.classId === classId);
  const students = studentsByClass[classId] ?? [];
  const exportBase = `/api/export/frequencia?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&year=${currentYear()}`;

  function isPresent(id: string) {
    return present[id] ?? true;
  }
  function toggle(id: string, val: boolean) {
    setPresent((p) => ({ ...p, [id]: val }));
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const items = students.map((s) => ({ studentId: s.id, present: isPresent(s.id), justified: false }));
      const res = await saveAttendance({ classId, subjectId, date, items });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        showToast({ tone: "error", title: res.error });
      }
      else {
        setFeedback({ type: "ok", msg: res.message ?? "Frequência salva." });
        showToast({ tone: "success", title: res.message ?? "Frequência salva." });
        router.refresh();
      }
    });
  }

  if (assignments.length === 0) {
    return <div className="card p-8 text-center text-slate-500">Você ainda não possui turmas vinculadas.</div>;
  }

  const presentCount = students.filter((s) => isPresent(s.id)).length;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectInput
            label="Turma"
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setPresent({}); }}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            label="Disciplina (opcional)"
            placeholder="Geral"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjects.map((s) => ({ value: s.subjectId, label: s.subjectName }))}
          />
          <FormInput label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Chamada · {students.length} alunos</h3>
          <span className="text-sm text-slate-400">{presentCount} presentes · {students.length - presentCount} ausentes</span>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {students.length === 0 && <li className="p-6 text-center text-sm text-slate-400">Nenhum aluno nesta turma.</li>}
          {students.map((s) => {
            const p = isPresent(s.id);
            return (
              <li key={s.id} className="flex items-center justify-between p-4">
                <span className="font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(s.id, true)}
                    aria-pressed={p}
                    className={cn("inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition", p ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/5")}
                  >
                    <Check className="h-4 w-4" /> Presente
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(s.id, false)}
                    aria-pressed={!p}
                    className={cn("inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition", !p ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/5")}
                  >
                    <X className="h-4 w-4" /> Falta
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? (
            <p className={`text-sm ${feedback.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>{feedback.msg}</p>
          ) : <span />}
          <div className="flex flex-wrap gap-2">
            <a
              href={`${exportBase}&format=csv`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Download className="h-4 w-4" /> CSV
            </a>
            <a
              href={`${exportBase}&format=pdf`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Download className="h-4 w-4" /> PDF
            </a>
            <Button onClick={save} loading={pending} disabled={students.length === 0}>
              <CalendarCheck className="h-4 w-4" /> Salvar frequência
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
