import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { getRelevantClassIds } from "./event.service";

interface ProfileLike {
  id: string;
  role: Role;
  teacherId?: string | null;
  studentId?: string | null;
  guardianId?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  role: Role;
}

const GESTAO: Role[] = ["ADMIN", "DIRETOR", "PEDAGOGA"];

/** Usuários com quem o perfil pode trocar mensagens. */
export async function getContacts(profile: ProfileLike): Promise<Contact[]> {
  if (GESTAO.includes(profile.role)) {
    return prisma.user.findMany({
      where: { active: true, id: { not: profile.id } },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  const classIds = await getRelevantClassIds(profile);
  const ids = new Set<string>();

  // Gestão e pedagogia sempre disponíveis
  const gestao = await prisma.user.findMany({ where: { role: { in: GESTAO }, active: true }, select: { id: true } });
  gestao.forEach((u) => ids.add(u.id));

  // Professores das turmas relevantes
  if (classIds.length) {
    const assignments = await prisma.teachingAssignment.findMany({
      where: { classId: { in: classIds } },
      select: { teacher: { select: { userId: true } } },
    });
    assignments.forEach((a) => ids.add(a.teacher.userId));
  }

  // Professor também fala com alunos/responsáveis das suas turmas e demais professores
  if (profile.role === "PROFESSOR" && classIds.length) {
    const students = await prisma.student.findMany({
      where: { classId: { in: classIds } },
      select: { userId: true, guardian: { select: { userId: true } } },
    });
    students.forEach((s) => {
      ids.add(s.userId);
      if (s.guardian) ids.add(s.guardian.userId);
    });
    const teachers = await prisma.user.findMany({ where: { role: "PROFESSOR", active: true }, select: { id: true } });
    teachers.forEach((t) => ids.add(t.id));
  }

  ids.delete(profile.id);
  return prisma.user.findMany({
    where: { id: { in: [...ids] }, active: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

/** Verifica se dois usuários podem se comunicar. */
export async function canMessage(profile: ProfileLike, recipientId: string): Promise<boolean> {
  const contacts = await getContacts(profile);
  return contacts.some((c) => c.id === recipientId);
}

/** Resumo das conversas do usuário (outro usuário, última mensagem, não lidas). */
export async function getConversationsSummary(userId: string) {
  const msgs = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, role: true } },
      recipient: { select: { id: true, name: true, role: true } },
    },
  });

  const map = new Map<string, { user: Contact; lastBody: string; lastAt: Date; unread: number }>();
  for (const m of msgs) {
    const other = m.senderId === userId ? m.recipient : m.sender;
    if (!map.has(other.id)) {
      map.set(other.id, { user: other, lastBody: m.body, lastAt: m.createdAt, unread: 0 });
    }
    if (m.recipientId === userId && m.readAt === null) {
      map.get(other.id)!.unread += 1;
    }
  }
  return [...map.values()];
}

/** Mensagens de uma conversa; marca como lidas as recebidas. */
export async function getConversationMessages(userId: string, otherId: string) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherId },
        { senderId: otherId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  await prisma.message.updateMany({
    where: { senderId: otherId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, role: true } });
  return { messages, other };
}

/** Total de mensagens não lidas do usuário. */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.message.count({ where: { recipientId: userId, readAt: null } });
}
