"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { profilePasswordSchema } from "@/validations";
import type { ActionResult } from "@/types";

export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = profilePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } });
  if (!user) return { ok: false, error: "Usuário não encontrado." };

  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return { ok: false, error: "Senha atual incorreta." };

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await logAction({ userId: session.id, action: "profile.password.update", entity: "User", entityId: session.id });
  revalidatePath("/dashboard/perfil");
  return { ok: true, message: "Senha atualizada com sucesso." };
}
