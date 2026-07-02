import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportCard } from "@/services/report-card.service";
import { buildSimplePdf, downloadResponse } from "@/lib/export";
import { currentYear } from "@/lib/utils";
import type { Term } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { studentId: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  const studentId = params.studentId;
  const yearParam = Number(new URL(req.url).searchParams.get("year"));
  const year = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : currentYear();

  // Controle de acesso por perfil
  let allowed = profile.role === "ADMIN" || profile.role === "DIRETOR" || profile.role === "PEDAGOGA";
  if (!allowed && profile.role === "ALUNO") allowed = profile.studentId === studentId;
  if (!allowed && profile.role === "RESPONSAVEL" && profile.guardianId) {
    const child = await prisma.student.findFirst({
      where: { id: studentId, guardianId: profile.guardianId },
      select: { id: true },
    });
    allowed = Boolean(child);
  }
  if (!allowed) return NextResponse.json({ ok: false, error: "Sem permissão para este boletim" }, { status: 403 });

  const rc = await getReportCard(studentId, year);
  if (!rc) return NextResponse.json({ ok: false, error: "Aluno não encontrado" }, { status: 404 });

  const fmt = (v: number | null) => (v === null ? "  - " : v.toFixed(1).padStart(4, " "));
  const cell = (t: Record<Term, number | null>) =>
    `${fmt(t.PRIMEIRO)}  ${fmt(t.SEGUNDO)}  ${fmt(t.TERCEIRO)}  ${fmt(t.QUARTO)}`;

  const lines: string[] = [
    `Aluno: ${rc.student.name}    Matricula: ${rc.student.registration}`,
    `Turma: ${rc.student.className ?? "-"}    Ano letivo: ${rc.year}`,
    "",
    "Disciplina             1Bim  2Bim  3Bim  4Bim   Media",
    "-------------------------------------------------------",
    ...rc.rows.map(
      (r) => `${r.subject.padEnd(20, " ").slice(0, 20)} ${cell(r.terms)}   ${fmt(r.media)}`,
    ),
    "-------------------------------------------------------",
    "",
    `Media geral: ${rc.overall !== null ? rc.overall.toFixed(1) : "-"}`,
    `Frequencia: ${rc.attendance.rate}%  (faltas: ${rc.attendance.absences} de ${rc.attendance.total} registros)`,
    `Situacao final: ${rc.situacao}`,
    "",
    `Emitido em ${new Date().toLocaleString("pt-BR")}`,
  ];

  if (rc.rows.length === 0) {
    lines.splice(5, 0, "(Nenhuma nota lançada para este ano letivo.)");
  }

  const pdf = buildSimplePdf(`Boletim Escolar - ${rc.year}`, lines);
  return downloadResponse(pdf, "application/pdf", `boletim-${rc.student.registration}-${rc.year}.pdf`);
}
