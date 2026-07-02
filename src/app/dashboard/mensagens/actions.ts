"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/validations";
import { canMessage } from "@/services/message.service";
import { logAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

export async function sendMessageAction(input: unknown): Promise<ActionResult<{ recipientId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (parsed.data.recipientId === profile.id) {
    return { ok: false, error: "Você não pode enviar mensagem para si mesmo." };
  }

  const allowed = await canMessage(profile, parsed.data.recipientId);
  if (!allowed) return { ok: false, error: "Você não pode enviar mensagem para este usuário." };

  await prisma.message.create({
    data: { senderId: profile.id, recipientId: parsed.data.recipientId, body: parsed.data.body.trim() },
  });

  await logAction({ userId: profile.id, action: "message.send", entity: "Message", entityId: parsed.data.recipientId });
  revalidatePath("/dashboard/mensagens");
  return { ok: true, data: { recipientId: parsed.data.recipientId }, message: "Mensagem enviada." };
}
