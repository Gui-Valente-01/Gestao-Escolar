import { prisma } from "@/lib/prisma";
import { average, currentYear } from "@/lib/utils";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/permissions";
import { getSchoolAverage, getAveragesByClass } from "./grade.service";
import { getStudentsWithManyAbsences, getSchoolAttendanceRate } from "./attendance.service";

// ----------------------------------------------------------------------------
// Administrador
// ----------------------------------------------------------------------------

export async function getAdminStats() {
  const [users, students, teachers, guardians, classes, subjects, aiCount] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.guardian.count(),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.aiInteraction.count(),
  ]);

  const roleGroups = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  const countByRole = Object.fromEntries(roleGroups.map((g) => [g.role, g._count._all]));
  const usersByRole = ALL_ROLES.map((role) => ({
    name: ROLE_LABELS[role],
    total: countByRole[role] ?? 0,
  }));

  const classesWithCount = await prisma.class.findMany({
    select: { name: true, _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });
  const studentsByClass = classesWithCount.map((c) => ({ name: c.name, alunos: c._count.students }));

  return { users, students, teachers, guardians, classes, subjects, aiCount, usersByRole, studentsByClass };
}

// ----------------------------------------------------------------------------
// Alunos em risco (média baixa)
// ----------------------------------------------------------------------------

export async function getStudentsAtRisk(maxAverage = 6, year = currentYear()) {
  const students = await prisma.student.findMany({
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
      grades: { where: { year }, select: { value: true } },
    },
  });
  return students
    .map((s) => ({
      id: s.id,
      name: s.user.name,
      className: s.class?.name ?? "Sem turma",
      media: average(s.grades.map((g) => g.value)),
    }))
    .filter((s) => s.media !== null && s.media < maxAverage)
    .sort((a, b) => (a.media ?? 0) - (b.media ?? 0));
}

// ----------------------------------------------------------------------------
// Diretor
// ----------------------------------------------------------------------------

export async function getDirectorStats(year = currentYear()) {
  const [students, teachers, classes, schoolAverage, averagesByClass, atRisk, manyAbsences, attendanceRate] =
    await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      getSchoolAverage(year),
      getAveragesByClass(year),
      getStudentsAtRisk(6, year),
      getStudentsWithManyAbsences(4),
      getSchoolAttendanceRate(),
    ]);

  const lowClasses = [...averagesByClass]
    .filter((c) => c.media > 0)
    .sort((a, b) => a.media - b.media)
    .slice(0, 3);

  return {
    students,
    teachers,
    classes,
    schoolAverage,
    attendanceRate,
    averagesByClass,
    lowClasses,
    atRisk,
    manyAbsences,
  };
}

// ----------------------------------------------------------------------------
// Comunicação (compartilhado)
// ----------------------------------------------------------------------------

export async function getRecentAnnouncements(limit = 5) {
  return prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { name: true } }, class: { select: { name: true } } },
  });
}

export async function getRecentOccurrences(limit = 5) {
  return prisma.occurrence.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      student: { include: { user: { select: { name: true } } } },
      reportedBy: { select: { name: true } },
    },
  });
}
