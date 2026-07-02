import { prisma } from "@/lib/prisma";
import { currentYear } from "@/lib/utils";

/** Vínculos de ensino do professor (disciplina + turma). */
export async function getTeacherAssignments(teacherId: string) {
  return prisma.teachingAssignment.findMany({
    where: { teacherId },
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, year: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });
}

/** Turmas distintas em que o professor leciona. */
export async function getTeacherClasses(teacherId: string) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId },
    select: { class: { select: { id: true, name: true, year: true } } },
    distinct: ["classId"],
  });
  return assignments.map((a) => a.class);
}

/** Disciplinas distintas do professor. */
export async function getTeacherSubjects(teacherId: string) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId },
    select: { subject: { select: { id: true, name: true } } },
    distinct: ["subjectId"],
  });
  return assignments.map((a) => a.subject);
}

/** Alunos das turmas do professor. */
export async function getTeacherStudents(teacherId: string) {
  const classes = await getTeacherClasses(teacherId);
  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) return [];
  return prisma.student.findMany({
    where: { classId: { in: classIds } },
    include: { user: { select: { name: true } }, class: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

/**
 * Verifica se um professor tem permissão sobre uma turma/disciplina.
 * Usado para garantir que só lance notas/faltas das suas turmas.
 */
export async function teacherCanManage(teacherId: string, classId: string, subjectId?: string) {
  const count = await prisma.teachingAssignment.count({
    where: { teacherId, classId, ...(subjectId ? { subjectId } : {}) },
  });
  return count > 0;
}

/** Médias das turmas do professor (para gráficos). */
export async function getTeacherClassPerformance(teacherId: string, year = currentYear()) {
  const classes = await getTeacherClasses(teacherId);
  const result = [];
  for (const c of classes) {
    const agg = await prisma.grade.aggregate({
      _avg: { value: true },
      where: { teacherId, student: { classId: c.id }, year },
    });
    result.push({ name: c.name, media: agg._avg.value ? Math.round(agg._avg.value * 10) / 10 : 0 });
  }
  return result;
}
