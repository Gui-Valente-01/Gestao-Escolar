import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { exportClassDataSchema } from "@/validations";
import { teacherCanManage } from "@/services/teacher.service";
import { buildCsv, buildSimplePdf, downloadResponse } from "@/lib/export";
import { formatDate } from "@/lib/utils";

export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = exportClassDataSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Parâmetros inválidos" }, { status: 400 });

  const { classId, subjectId, year, format } = parsed.data;
  const canExport =
    profile.role === "ADMIN" ||
    profile.role === "DIRETOR" ||
    (profile.role === "PROFESSOR" &&
      profile.teacherId &&
      (await teacherCanManage(profile.teacherId, classId, subjectId || undefined)));

  if (!canExport) return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });

  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  const records = await prisma.attendance.findMany({
    where: {
      student: { classId },
      date: { gte: from, lt: to },
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true } }, class: { select: { name: true } } } },
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ date: "desc" }, { student: { user: { name: "asc" } } }],
  });

  const headers = ["Data", "Aluno", "Turma", "Disciplina", "Situação", "Justificada", "Professor", "Observação"];
  const rows = records.map((r) => [
    formatDate(r.date),
    r.student.user.name,
    r.student.class?.name ?? "",
    r.subject?.name ?? "Geral",
    r.present ? "Presente" : "Falta",
    r.justified ? "Sim" : "Não",
    r.teacher?.user.name ?? "",
    r.note ?? "",
  ]);

  const filename = `frequencia-${year}.${format}`;
  if (format === "csv") {
    return downloadResponse(buildCsv(headers, rows), "text/csv; charset=utf-8", filename);
  }

  const lines = [
    headers.join(" | "),
    ...rows.map((row) => row.join(" | ")),
    ...(rows.length ? [] : ["Nenhum registro de frequência encontrado para os filtros selecionados."]),
  ];
  return downloadResponse(buildSimplePdf(`Frequência da turma - ${year}`, lines), "application/pdf", filename);
}
