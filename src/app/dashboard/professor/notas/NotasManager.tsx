"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useToast } from "@/components/providers/ToastProvider";
import { currentYear, formatDate, gradeColor, humanizeEnum } from "@/lib/utils";
import { launchGrade, deleteGrade } from "../actions";

interface Assignment { classId: string; className: string; subjectId: string; subjectName: string }
interface Student { id: string; name: string }
interface GradeRow {
  id: string;
  student: string;
  subject: string;
  term: string;
  value: number;
  year: number;
  createdAt: string;
}

const TERMS = ["PRIMEIRO", "SEGUNDO", "TERCEIRO", "QUARTO"];

export function NotasManager({
  assignments,
  studentsByClass,
  grades,
}: {
  assignments: Assignment[];
  studentsByClass: Record<string, Student[]>;
  grades: GradeRow[];
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
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("PRIMEIRO");
  const [value, setValue] = useState("");
  const [assessment, setAssessment] = useState("");

  const subjects = assignments.filter((a) => a.classId === classId);
  const students = studentsByClass[classId] ?? [];
  const exportBase = `/api/export/notas?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&year=${currentYear()}`;

  function submit() {
    setFeedback(null);
    startTransition(async () => {
      const res = await launchGrade({
        studentId,
        subjectId,
        term,
        year: currentYear(),
        value: Number(value),
        assessment,
      });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        showToast({ tone: "error", title: res.error });
      }
      else {
        setFeedback({ type: "ok", msg: res.message ?? "Nota lançada." });
        showToast({ tone: "success", title: res.message ?? "Nota lancada." });
        setValue("");
        setAssessment("");
        router.refresh();
      }
    });
  }

  async function remove(id: string) {
    if (!confirm("Remover esta nota?")) return;
    const res = await deleteGrade(id);
    if (!res.ok) showToast({ tone: "error", title: res.error });
    else {
      showToast({ tone: "success", title: res.message ?? "Nota removida." });
      router.refresh();
    }
  }

  const columns: Column<GradeRow>[] = [
    { key: "student", header: "Aluno", render: (g) => <span className="font-medium text-slate-800 dark:text-white">{g.student}</span> },
    { key: "subject", header: "Disciplina" },
    { key: "term", header: "Bimestre", render: (g) => <Badge tone="brand">{humanizeEnum(g.term)}</Badge> },
    { key: "value", header: "Nota", render: (g) => <span className={`font-bold ${gradeColor(g.value)}`}>{g.value.toFixed(1)}</span> },
    { key: "createdAt", header: "Lançada em", render: (g) => formatDate(g.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (g) => (
        <button onClick={() => remove(g.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-600" aria-label="Remover nota"><Trash2 className="h-4 w-4" /></button>
      ),
    },
  ];

  if (assignments.length === 0) {
    return <div className="card p-8 text-center text-slate-500">Você ainda não possui turmas/disciplinas vinculadas.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Lançar nota</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectInput
            label="Turma"
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setStudentId(""); }}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            label="Disciplina"
            placeholder="Selecione"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjects.map((s) => ({ value: s.subjectId, label: s.subjectName }))}
          />
          <SelectInput
            label="Aluno"
            placeholder="Selecione"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
          <SelectInput label="Bimestre" value={term} onChange={(e) => setTerm(e.target.value)} options={TERMS.map((t) => ({ value: t, label: humanizeEnum(t) }))} />
          <FormInput label="Nota (0 a 10)" type="number" step="0.1" min="0" max="10" value={value} onChange={(e) => setValue(e.target.value)} />
          <FormInput label="Avaliação (opcional)" placeholder="Ex: Prova 1" value={assessment} onChange={(e) => setAssessment(e.target.value)} />
        </div>
        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>{feedback.msg}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={submit} loading={pending} disabled={!subjectId || !studentId || !value}>
            <Plus className="h-4 w-4" /> Lançar nota
          </Button>
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
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Notas lançadas recentemente</h3>
        <DataTable data={grades} columns={columns} getSearchText={(g) => `${g.student} ${g.subject}`} />
      </div>
    </div>
  );
}
