import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Registra uma ação importante para fins de auditoria/LGPD.
 * Falhas de log nunca devem quebrar a operação principal.
 */
export async function logAction(params: {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const data = {
    userId: params.userId ?? null,
    action: params.action,
    entity: params.entity ?? null,
    entityId: params.entityId ?? null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  };

  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    if (
      data.userId &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      await prisma.auditLog.create({
        data: {
          ...data,
          userId: null,
          metadata: JSON.stringify({
            ...(params.metadata ?? {}),
            originalUserId: data.userId,
            auditWarning: "userId not found when writing audit log",
          }),
        },
      });
      return;
    }

    console.error("[audit] falha ao registrar log:", err);
  }
}
