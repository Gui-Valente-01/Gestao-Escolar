import { prisma } from "@/lib/prisma";

export { SUPPORT_NEED_LABELS } from "@/lib/support-labels";

/** Laudos/necessidades de um aluno. */
export async function listSupportNeeds(studentId: string) {
  return prisma.studentSupportNeed.findMany({
    where: { studentId },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
}

/** Anotações de desenvolvimento de um aluno (mais recentes primeiro). */
export async function listDevelopmentNotes(studentId: string) {
  return prisma.studentDevelopmentNote.findMany({
    where: { studentId },
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Lista alunos com seus laudos ativos (para professor/pedagoga verem quem possui laudo).
 * Se classIds for informado, filtra pelas turmas (professor); senão traz todos (pedagoga/gestão).
 */
export async function getStudentsWithSupport(classIds?: string[]) {
  const students = await prisma.student.findMany({
    where: classIds ? { classId: { in: classIds } } : {},
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
      guardian: { include: { user: { select: { name: true } } } },
      supportNeeds: { where: { active: true }, select: { type: true } },
      _count: { select: { developmentNotes: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return students.map((s) => ({
    id: s.id,
    name: s.user.name,
    registration: s.registration,
    className: s.class?.name ?? null,
    guardianName: s.guardian?.user.name ?? null,
    guardianId: s.guardianId,
    needs: s.supportNeeds.map((n) => n.type),
    notesCount: s._count.developmentNotes,
  }));
}

/** Fichas serializadas (prontas para a UI): aluno + laudos + anotações + contato. */
export async function getFichas(classIds?: string[]) {
  const students = await getStudentsFullSupport(classIds);
  return students.map((s) => ({
    id: s.id,
    name: s.user.name,
    registration: s.registration,
    className: s.class?.name ?? null,
    guardian: s.guardian
      ? { name: s.guardian.user.name, email: s.guardian.user.email, phone: s.guardian.phone }
      : null,
    needs: s.supportNeeds.map((n) => ({
      id: n.id,
      type: n.type as string,
      description: n.description,
      observations: n.observations,
      documentUrl: n.documentUrl,
      active: n.active,
      author: n.createdBy.name,
      createdAt: n.createdAt.toISOString(),
    })),
    notes: s.developmentNotes.map((n) => ({
      id: n.id,
      content: n.content,
      author: n.author.name,
      role: n.author.role as string,
      createdAt: n.createdAt.toISOString(),
    })),
  }));
}

/** Ficha completa dos alunos: laudos + anotações + contato do responsável. */
export async function getStudentsFullSupport(classIds?: string[]) {
  return prisma.student.findMany({
    where: classIds ? { classId: { in: classIds } } : {},
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
      guardian: { select: { phone: true, user: { select: { name: true, email: true } } } },
      supportNeeds: {
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      },
      developmentNotes: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}
