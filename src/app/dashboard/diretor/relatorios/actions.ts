"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { schoolReportSchema } from "@/validations";
import { generateManagerSchoolReport } from "@/services/ai.service";
import type { ActionResult } from "@/types";

export async function generateSchoolReport(input: unknown): Promise<ActionResult<{ reportId: string }>> {
  const user = await requireRole(["ADMIN", "DIRETOR"]);
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sessão expirada." };

  const parsed = schoolReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { report, result } = await generateManagerSchoolReport({
      profile,
      title: parsed.data.title,
      scope: parsed.data.scope,
      period: parsed.data.period,
      classId: parsed.data.classId || null,
      studentId: parsed.data.studentId || null,
    });

    await logAction({
      userId: user.id,
      action: "schoolReport.create",
      entity: "SchoolReport",
      entityId: report.id,
      metadata: { scope: report.scope, model: result.model },
    });

    revalidatePath("/dashboard/diretor/relatorios");
    return { ok: true, data: { reportId: report.id }, message: "Relatório gerado e salvo." };
  } catch (err) {
    console.error("[schoolReport] erro:", err);
    return { ok: false, error: "Não foi possível gerar o relatório agora." };
  }
}
