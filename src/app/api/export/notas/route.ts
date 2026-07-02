import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { exportClassDataSchema } from "@/validations";
import { teacherCanManage } from "@/services/teacher.service";
import { buildCsv, buildSimplePdf, downloadResponse } from "@/lib/export";
import { formatDate, humanizeEnum } from "@/lib/utils";

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

  const grades = await prisma.grade.findMany({
    where: { student: { classId }, year, ...(subjectId ? { subjectId } : {}) },
    include: {
      student: { include: { user: { select: { name: true } }, class: { select: { name: true } } } },
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ student: { user: { name: "asc" } } }, { subject: { name: "asc" } }, { term: "asc" }],
  });

  const headers = ["Aluno", "Turma", "Disciplina", "Bimestre", "Avaliação", "Nota", "Professor", "Data"];
  const rows = grades.map((g) => [
    g.student.user.name,
    g.student.class?.name ?? "",
    g.subject.name,
    humanizeEnum(g.term),
    g.assessment ?? "",
    g.value.toFixed(1),
    g.teacher.user.name,
    formatDate(g.createdAt),
  ]);

  const filename = `notas-${year}.${format}`;
  if (format === "csv") {
    return downloadResponse(buildCsv(headers, rows), "text/csv; charset=utf-8", filename);
  }

  const lines = [
    headers.join(" | "),
    ...rows.map((row) => row.join(" | ")),
    ...(rows.length ? [] : ["Nenhuma nota encontrada para os filtros selecionados."]),
  ];
  return downloadResponse(buildSimplePdf(`Notas da turma - ${year}`, lines), "application/pdf", filename);
}
