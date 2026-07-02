"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Sparkles } from "lucide-react";
import type { ReportScope } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDateTime, humanizeEnum } from "@/lib/utils";
import { generateSchoolReport } from "./actions";

interface Option {
  id: string;
  name: string;
}

interface StudentOption extends Option {
  classId: string | null;
  className: string | null;
}

interface ReportRow {
  id: string;
  title: string;
  scope: ReportScope;
  period: string | null;
  author: string;
  createdAt: string;
}

export function RelatoriosManager({
  classes,
  students,
  reports,
}: {
  classes: Option[];
  students: StudentOption[];
  reports: ReportRow[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<ReportScope>("ESCOLA");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const studentOptions = useMemo(() => {
    if (!classId) return students;
    return students.filter((s) => s.classId === classId);
  }, [classId, students]);

  function submit() {
    setFeedback(null);
    startTransition(async () => {
      const res = await generateSchoolReport({
        title,
        period,
        scope,
        classId,
        studentId,
      });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        showToast({ tone: "error", title: res.error });
        return;
      }
      setFeedback({ type: "ok", msg: res.message ?? "Relatório salvo." });
      showToast({ tone: "success", title: res.message ?? "Relatório salvo." });
      router.push(`/dashboard/diretor/relatorios/${res.data?.reportId}`);
    });
  }

  const columns: Column<ReportRow>[] = [
    {
      key: "title",
      header: "Relatório",
      render: (r) => (
        <Link href={`/dashboard/diretor/relatorios/${r.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-white">
          {r.title}
        </Link>
      ),
    },
    { key: "scope", header: "Escopo", render: (r) => <Badge tone="brand">{humanizeEnum(r.scope)}</Badge> },
    { key: "period", header: "Período", render: (r) => r.period ?? "-" },
    { key: "author", header: "Autor" },
    { key: "createdAt", header: "Gerado em", render: (r) => formatDateTime(r.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Link
          href={`/dashboard/diretor/relatorios/${r.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-500/10"
        >
          <FileSearch className="h-4 w-4" /> Abrir
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Gerar novo relatório</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SelectInput
            label="Escopo"
            value={scope}
            onChange={(e) => {
              const next = e.target.value as ReportScope;
              setScope(next);
              if (next === "ESCOLA") {
                setClassId("");
                setStudentId("");
              }
              if (next === "TURMA") setStudentId("");
            }}
            options={[
              { value: "ESCOLA", label: "Escola" },
              { value: "TURMA", label: "Turma" },
              { value: "ALUNO", label: "Aluno" },
            ]}
          />
          <FormInput
            label="Período"
            placeholder="Ex: 1º bimestre 2026"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <FormInput
            label="Título (opcional)"
            placeholder="Relatório de desempenho"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {(scope === "TURMA" || scope === "ALUNO") && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SelectInput
              label="Turma"
              placeholder="Selecione"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStudentId("");
              }}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            {scope === "ALUNO" && (
              <SelectInput
                label="Aluno"
                placeholder="Selecione"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                options={studentOptions.map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.className ? ` - ${s.className}` : ""}`,
                }))}
              />
            )}
          </div>
        )}

        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>
            {feedback.msg}
          </p>
        )}

        <div className="mt-4">
          <Button
            onClick={submit}
            loading={pending}
            disabled={(scope === "TURMA" && !classId) || (scope === "ALUNO" && !studentId)}
          >
            <Sparkles className="h-4 w-4" /> Gerar e salvar
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Relatórios salvos</h2>
        <DataTable
          data={reports}
          columns={columns}
          getSearchText={(r) => `${r.title} ${r.scope} ${r.period ?? ""} ${r.author}`}
          emptyMessage="Nenhum relatório gerado ainda."
        />
      </div>
    </div>
  );
}
