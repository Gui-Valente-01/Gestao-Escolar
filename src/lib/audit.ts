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
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log:", err);
  }
}
