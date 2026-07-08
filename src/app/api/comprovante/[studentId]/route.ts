import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSimplePdf, downloadResponse } from "@/lib/export";
import { formatDate, humanizeEnum, currentYear } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

  const studentId = params.studentId;

  // Controle de acesso: aluno (o próprio), responsável (filhos), gestão (qualquer um)
  let allowed = profile.role === "ADMIN" || profile.role === "DIRETOR" || profile.role === "PEDAGOGA";
  if (!allowed && profile.role === "ALUNO") allowed = profile.studentId === studentId;
  if (!allowed && profile.role === "RESPONSAVEL" && profile.guardianId) {
    const child = await prisma.student.findFirst({
      where: { id: studentId, guardianId: profile.guardianId },
      select: { id: true },
    });
    allowed = Boolean(child);
  }
  if (!allowed) return NextResponse.json({ ok: false, error: "Sem permissão para este comprovante" }, { status: 403 });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true, year: true, shift: true } },
      enrollments: { orderBy: { year: "desc" }, take: 1 },
    },
  });
  if (!student) return NextResponse.json({ ok: false, error: "Aluno não encontrado" }, { status: 404 });

  const enrollment = student.enrollments[0];
  const year = enrollment?.year ?? student.class?.year ?? currentYear();
  const schoolName = process.env.NEXT_PUBLIC_APP_NAME || "EduGestão IA";

  const lines = [
    schoolName,
    "COMPROVANTE DE MATRICULA",
    "",
    "Declaramos, para os devidos fins, que o(a) aluno(a) abaixo",
    "encontra-se regularmente matriculado(a) nesta instituicao de ensino:",
    "",
    `Aluno(a): ${student.user.name}`,
    `Matricula: ${student.registration}`,
    `Data de nascimento: ${formatDate(student.birthDate)}`,
    `Turma: ${student.class?.name ?? "Sem turma"}`,
    `Turno: ${student.class?.shift ? humanizeEnum(student.class.shift) : "-"}`,
    `Ano letivo: ${year}`,
    `Situacao da matricula: ${enrollment ? humanizeEnum(enrollment.status) : "Ativa"}`,
    "",
    `Documento emitido em ${new Date().toLocaleString("pt-BR")}.`,
    "",
    "Este comprovante e valido como declaracao de matricula.",
  ];

  const pdf = buildSimplePdf(`Comprovante de Matricula - ${year}`, lines);
  return downloadResponse(pdf, "application/pdf", `comprovante-matricula-${student.registration}.pdf`);
}
