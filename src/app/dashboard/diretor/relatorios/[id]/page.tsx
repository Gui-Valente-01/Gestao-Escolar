import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSearch } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, humanizeEnum } from "@/lib/utils";

export default async function RelatorioDetalhePage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "DIRETOR"]);

  const report = await prisma.schoolReport.findUnique({
    where: { id: params.id },
    include: { author: { select: { name: true } } },
  });
  if (!report) notFound();

  const [cls, student] = await Promise.all([
    report.classId ? prisma.class.findUnique({ where: { id: report.classId }, select: { name: true, year: true } }) : null,
    report.studentId
      ? prisma.student.findUnique({
          where: { id: report.studentId },
          include: { user: { select: { name: true } }, class: { select: { name: true } } },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.title}
        subtitle={`Gerado por ${report.author.name} em ${formatDateTime(report.createdAt)}`}
        action={
          <Link
            href="/dashboard/diretor/relatorios"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        }
      />

      <div className="card p-5">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{humanizeEnum(report.scope)}</Badge>
          {report.period && <Badge tone="violet">{report.period}</Badge>}
          {cls && <Badge tone="emerald">{cls.name} ({cls.year})</Badge>}
          {student && <Badge tone="amber">{student.user.name}</Badge>}
        </div>

        <div className="mb-4 flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <FileSearch className="h-5 w-5 text-brand-500" />
          <h2 className="text-base font-semibold">Conteúdo do relatório</h2>
        </div>

        <article className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:prose-invert dark:text-slate-200">
          {report.content}
        </article>
      </div>
    </div>
  );
}
