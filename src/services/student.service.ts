import { prisma } from "@/lib/prisma";
import { currentYear } from "@/lib/utils";
import { getStudentAverage, getStudentGradesBySubject, getStudentGradesByTerm } from "./grade.service";
import { getStudentAttendanceSummary } from "./attendance.service";

/** Lista resumida de alunos (para selects e tabelas). */
export async function listStudents(classId?: string) {
  return prisma.student.findMany({
    where: classId ? { classId } : {},
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { id: true, name: true } },
      guardian: { include: { user: { select: { name: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

/** Contexto completo de um aluno (perfil + notas + faltas + ocorrências + acompanhamentos). */
export async function getStudentContext(studentId: string, year = currentYear()) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { name: true, year: true } },
      guardian: { include: { user: { select: { name: true } } } },
      occurrences: { orderBy: { date: "desc" }, take: 8 },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!student) return null;

  const [average, bySubject, byTerm, attendance] = await Promise.all([
    getStudentAverage(studentId, year),
    getStudentGradesBySubject(studentId, year),
    getStudentGradesByTerm(studentId, year),
    getStudentAttendanceSummary(studentId),
  ]);

  return { student, average, bySubject, byTerm, attendance };
}

/** Notas detalhadas de um aluno (para a página "minhas notas"). */
export async function getStudentGrades(studentId: string, year = currentYear()) {
  return prisma.grade.findMany({
    where: { studentId, year },
    include: { subject: { select: { name: true } }, teacher: { include: { user: { select: { name: true } } } } },
    orderBy: [{ subject: { name: "asc" } }, { term: "asc" }],
  });
}

/** Registros de frequência de um aluno. */
export async function getStudentAttendance(studentId: string) {
  return prisma.attendance.findMany({
    where: { studentId },
    include: { subject: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 60,
  });
}

/** Atividades pendentes da turma do aluno. */
export async function getStudentActivities(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
  if (!student?.classId) return [];
  return prisma.activity.findMany({
    where: { classId: student.classId },
    include: { subject: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

/** Alunos vinculados a um responsável. */
export async function getGuardianStudents(guardianId: string) {
  return prisma.student.findMany({
    where: { guardianId },
    include: { user: { select: { name: true } }, class: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}
