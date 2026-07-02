import { prisma } from "@/lib/prisma";
import { average, currentYear } from "@/lib/utils";
import { getStudentAttendanceSummary } from "./attendance.service";
import type { Term } from "@prisma/client";

const TERMS: Term[] = ["PRIMEIRO", "SEGUNDO", "TERCEIRO", "QUARTO"];

export interface ReportCardRow {
  subject: string;
  terms: Record<Term, number | null>;
  media: number | null;
}

export interface ReportCard {
  student: { name: string; registration: string; className: string | null };
  year: number;
  rows: ReportCardRow[];
  overall: number | null;
  attendance: { total: number; absences: number; rate: number };
  situacao: string;
}

/** Monta o boletim de um aluno: notas por disciplina/bimestre, média, frequência e situação. */
export async function getReportCard(studentId: string, year = currentYear()): Promise<ReportCard | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true } }, class: { select: { name: true } } },
  });
  if (!student) return null;

  const grades = await prisma.grade.findMany({
    where: { studentId, year },
    include: { subject: { select: { name: true } } },
  });

  // Agrupa: disciplina -> bimestre -> notas
  const bySubject = new Map<string, Record<Term, number[]>>();
  for (const g of grades) {
    const name = g.subject.name;
    if (!bySubject.has(name)) {
      bySubject.set(name, { PRIMEIRO: [], SEGUNDO: [], TERCEIRO: [], QUARTO: [] });
    }
    bySubject.get(name)![g.term].push(g.value);
  }

  const rows: ReportCardRow[] = [...bySubject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, byTerm]) => {
      const terms = {} as Record<Term, number | null>;
      const termAverages: number[] = [];
      for (const term of TERMS) {
        const avg = average(byTerm[term]);
        terms[term] = avg;
        if (avg !== null) termAverages.push(avg);
      }
      return { subject, terms, media: average(termAverages) };
    });

  const overall = average(rows.map((r) => r.media).filter((v): v is number => v !== null));
  const att = await getStudentAttendanceSummary(studentId);

  let situacao = "Sem dados suficientes";
  if (overall !== null) {
    if (att.rate < 75) situacao = "Reprovado por frequência";
    else if (overall >= 7) situacao = "Aprovado";
    else if (overall >= 5) situacao = "Em recuperação";
    else situacao = "Reprovado";
  }

  return {
    student: { name: student.user.name, registration: student.registration, className: student.class?.name ?? null },
    year,
    rows,
    overall,
    attendance: { total: att.total, absences: att.absences, rate: att.rate },
    situacao,
  };
}
