import { prisma } from "@/lib/prisma";
import type { Audience, Prisma, Role } from "@prisma/client";

interface ProfileLike {
  role: Role;
  teacherId?: string | null;
  studentId?: string | null;
  guardianId?: string | null;
}

const GESTAO: Role[] = ["ADMIN", "DIRETOR", "PEDAGOGA"];
const ROLE_AUDIENCE: Partial<Record<Role, Audience>> = {
  ALUNO: "ALUNOS",
  RESPONSAVEL: "RESPONSAVEIS",
  PROFESSOR: "PROFESSORES",
};

/** Turmas relevantes para o usuário (professor: que leciona; aluno: a sua; responsável: dos filhos). */
export async function getRelevantClassIds(profile: ProfileLike): Promise<string[]> {
  if (profile.role === "PROFESSOR" && profile.teacherId) {
    const rows = await prisma.teachingAssignment.findMany({
      where: { teacherId: profile.teacherId },
      select: { classId: true },
      distinct: ["classId"],
    });
    return rows.map((r) => r.classId);
  }
  if (profile.role === "ALUNO" && profile.studentId) {
    const s = await prisma.student.findUnique({ where: { id: profile.studentId }, select: { classId: true } });
    return s?.classId ? [s.classId] : [];
  }
  if (profile.role === "RESPONSAVEL" && profile.guardianId) {
    const kids = await prisma.student.findMany({ where: { guardianId: profile.guardianId }, select: { classId: true } });
    return kids.map((k) => k.classId).filter((c): c is string => Boolean(c));
  }
  return [];
}

/** Lista os eventos visíveis para o usuário (gestão vê todos). */
export async function listEventsForUser(profile: ProfileLike, opts?: { from?: Date; to?: Date }) {
  const where: Prisma.EventWhereInput = {};
  if (opts?.from || opts?.to) {
    where.startsAt = {
      ...(opts.from ? { gte: opts.from } : {}),
      ...(opts.to ? { lte: opts.to } : {}),
    };
  }

  if (!GESTAO.includes(profile.role)) {
    const classIds = await getRelevantClassIds(profile);
    const roleAudience = ROLE_AUDIENCE[profile.role];
    where.AND = [
      { OR: [{ classId: null }, ...(classIds.length ? [{ classId: { in: classIds } }] : [])] },
      { OR: [{ audience: "TODOS" }, ...(roleAudience ? [{ audience: roleAudience }] : [])] },
    ];
  }

  return prisma.event.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: { class: { select: { name: true } }, author: { select: { name: true } } },
  });
}

/** Próximos eventos (a partir de hoje) para exibir em dashboards. */
export async function getUpcomingEvents(profile: ProfileLike, limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = await listEventsForUser(profile, { from: today });
  return events.slice(0, limit);
}
