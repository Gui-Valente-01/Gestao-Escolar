import { prisma } from "@/lib/prisma";
import { average } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

/** Média geral de um aluno (todas as disciplinas). */
export async function getStudentAverage(studentId: string, year?: number): Promise<number | null> {
  const where: Prisma.GradeWhereInput = { studentId, ...(year ? { year } : {}) };
  const grades = await prisma.grade.findMany({ where, select: { value: true } });
  return average(grades.map((g) => g.value));
}

/** Média de uma turma. */
export async function getClassAverage(classId: string, year?: number): Promise<number | null> {
  const r = await prisma.grade.aggregate({
    _avg: { value: true },
    where: { student: { classId }, ...(year ? { year } : {}) },
  });
  return r._avg.value !== null ? Math.round(r._avg.value * 10) / 10 : null;
}

/** Média geral da escola. */
export async function getSchoolAverage(year?: number): Promise<number | null> {
  const r = await prisma.grade.aggregate({
    _avg: { value: true },
    where: year ? { year } : {},
  });
  return r._avg.value !== null ? Math.round(r._avg.value * 10) / 10 : null;
}

/** Média de cada disciplina para um aluno. */
export async function getStudentGradesBySubject(studentId: string, year?: number) {
  const grouped = await prisma.grade.groupBy({
    by: ["subjectId"],
    where: { studentId, ...(year ? { year } : {}) },
    _avg: { value: true },
  });
  const subjects = await prisma.subject.findMany({
    where: { id: { in: grouped.map((g) => g.subjectId) } },
    select: { id: true, name: true },
  });
  const nameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  return grouped.map((g) => ({
    subject: nameById[g.subjectId] ?? "—",
    media: g._avg.value !== null ? Math.round(g._avg.value * 10) / 10 : 0,
  }));
}

/** Média por bimestre para um aluno (evolução). */
export async function getStudentGradesByTerm(studentId: string, year?: number) {
  const grouped = await prisma.grade.groupBy({
    by: ["term"],
    where: { studentId, ...(year ? { year } : {}) },
    _avg: { value: true },
  });
  const order = ["PRIMEIRO", "SEGUNDO", "TERCEIRO", "QUARTO"];
  const labels: Record<string, string> = {
    PRIMEIRO: "1º Bim",
    SEGUNDO: "2º Bim",
    TERCEIRO: "3º Bim",
    QUARTO: "4º Bim",
  };
  return grouped
    .sort((a, b) => order.indexOf(a.term) - order.indexOf(b.term))
    .map((g) => ({
      name: labels[g.term],
      media: g._avg.value !== null ? Math.round(g._avg.value * 10) / 10 : 0,
    }));
}

/** Média por turma (para o painel do diretor). */
export async function getAveragesByClass(year?: number) {
  const classes = await prisma.class.findMany({ select: { id: true, name: true } });
  const result = [];
  for (const c of classes) {
    const media = await getClassAverage(c.id, year);
    result.push({ name: c.name, media: media ?? 0 });
  }
  return result;
}
