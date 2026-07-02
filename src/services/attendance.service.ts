import { prisma } from "@/lib/prisma";

export interface AttendanceSummary {
  total: number;
  present: number;
  absences: number;
  justified: number;
  rate: number; // % de presença
}

/** Resumo de frequência de um aluno. */
export async function getStudentAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const [total, absences, justified] = await Promise.all([
    prisma.attendance.count({ where: { studentId } }),
    prisma.attendance.count({ where: { studentId, present: false } }),
    prisma.attendance.count({ where: { studentId, present: false, justified: true } }),
  ]);
  const present = total - absences;
  const rate = total ? Math.round((present / total) * 100) : 100;
  return { total, present, absences, justified, rate };
}

/** Quantidade de faltas de um aluno. */
export async function getStudentAbsences(studentId: string): Promise<number> {
  return prisma.attendance.count({ where: { studentId, present: false } });
}

/** Alunos com mais faltas que o limite informado. */
export async function getStudentsWithManyAbsences(threshold = 4, limit = 10) {
  const grouped = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: { present: false },
    _count: { _all: true },
    having: { studentId: { _count: { gt: threshold } } },
    orderBy: { _count: { studentId: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];
  const students = await prisma.student.findMany({
    where: { id: { in: grouped.map((g) => g.studentId) } },
    include: { user: { select: { name: true } }, class: { select: { name: true } } },
  });
  const map = Object.fromEntries(students.map((s) => [s.id, s]));
  return grouped.map((g) => ({
    studentId: g.studentId,
    name: map[g.studentId]?.user.name ?? "—",
    className: map[g.studentId]?.class?.name ?? "Sem turma",
    absences: g._count._all,
  }));
}
