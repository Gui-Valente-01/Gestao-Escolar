"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/validations";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

export async function createEvent(input: unknown): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!PERMISSIONS.manageEvents(profile.role)) return { ok: false, error: "Sem permissão para criar eventos." };

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const startsAt = new Date(d.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Data de início inválida." };
  const endsAt = d.endsAt ? new Date(d.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) return { ok: false, error: "Data de término inválida." };

  // Professor só pode vincular evento a turma que leciona
  if (profile.role === "PROFESSOR" && d.classId) {
    const teaches = await prisma.teachingAssignment.findFirst({
      where: { teacherId: profile.teacherId ?? "", classId: d.classId },
      select: { id: true },
    });
    if (!teaches) return { ok: false, error: "Você não leciona nesta turma." };
  }

  const event = await prisma.event.create({
    data: {
      title: d.title,
      description: d.description || null,
      type: d.type,
      startsAt,
      endsAt,
      allDay: d.allDay,
      audience: d.audience,
      classId: d.classId || null,
      authorId: profile.id,
    },
  });

  await logAction({ userId: profile.id, action: "event.create", entity: "Event", entityId: event.id });
  revalidatePath("/dashboard/calendario");
  return { ok: true, message: "Evento criado." };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };
  if (!PERMISSIONS.manageEvents(profile.role)) return { ok: false, error: "Sem permissão." };

  const event = await prisma.event.findUnique({ where: { id }, select: { authorId: true } });
  if (!event) return { ok: false, error: "Evento não encontrado." };

  // Autor pode excluir o próprio; gestão pode excluir qualquer um
  const isGestao = ["ADMIN", "DIRETOR", "PEDAGOGA"].includes(profile.role);
  if (!isGestao && event.authorId !== profile.id) {
    return { ok: false, error: "Você só pode excluir eventos criados por você." };
  }

  await prisma.event.delete({ where: { id } });
  await logAction({ userId: profile.id, action: "event.delete", entity: "Event", entityId: id });
  revalidatePath("/dashboard/calendario");
  return { ok: true, message: "Evento removido." };
}
