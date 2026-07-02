import type { AgentType, ReportScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callAi, AGENTS } from "@/lib/ai";
import { humanizeEnum } from "@/lib/utils";
import { getDirectorStats } from "./stats.service";
import { getStudentContext } from "./student.service";
import { getTeacherClasses, getTeacherSubjects, getTeacherClassPerformance, teacherCanManage } from "./teacher.service";

interface ProfileIds {
  id: string;
  role: string;
  teacherId: string | null;
  studentId: string | null;
  guardianId: string | null;
}

/** Texto legível com o contexto completo de um aluno. */
async function describeStudent(studentId: string): Promise<string> {
  const ctx = await getStudentContext(studentId);
  if (!ctx) return "Aluno não encontrado.";
  const { student, average, bySubject, attendance } = ctx;
  const grades = bySubject.map((g) => `  - ${g.subject}: ${g.media}`).join("\n") || "  (sem notas)";
  const occ = student.occurrences.map((o) => `  - [${humanizeEnum(o.severity)}] ${o.type}: ${o.description}`).join("\n") || "  (nenhuma)";
  const follows = student.followUps.map((f) => `  - ${f.title} (${humanizeEnum(f.status)}): ${f.notes}`).join("\n") || "  (nenhum)";
  return [
    `Aluno: ${student.user.name}`,
    `Turma: ${student.class?.name ?? "Sem turma"}`,
    `Responsável: ${student.guardian?.user.name ?? "Não informado"}`,
    `Média geral: ${average ?? "sem notas"}`,
    `Frequência: ${attendance.rate}% de presença, ${attendance.absences} faltas (${attendance.justified} justificadas)`,
    `Médias por disciplina:\n${grades}`,
    `Ocorrências:\n${occ}`,
    `Acompanhamentos pedagógicos:\n${follows}`,
  ].join("\n");
}

async function describeSchoolOverview(): Promise<string> {
  const s = await getDirectorStats();
  const byClass = s.averagesByClass.map((c) => `  - ${c.name}: ${c.media}`).join("\n");
  const risk = s.atRisk.map((a) => `  - ${a.name} (${a.className}): média ${a.media}`).join("\n") || "  (nenhum)";
  const abs = s.manyAbsences.map((a) => `  - ${a.name} (${a.className}): ${a.absences} faltas`).join("\n") || "  (nenhum)";
  return [
    "DADOS GERAIS DA ESCOLA:",
    `Total de alunos: ${s.students} | Professores: ${s.teachers} | Turmas: ${s.classes}`,
    `Média geral da escola: ${s.schoolAverage ?? "sem dados"}`,
    `Médias por turma:\n${byClass}`,
    `Alunos em risco (média < 6):\n${risk}`,
    `Alunos com muitas faltas:\n${abs}`,
  ].join("\n");
}

async function describeClass(classId: string): Promise<string> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        include: {
          user: { select: { name: true } },
          guardian: { include: { user: { select: { name: true } } } },
        },
        orderBy: { user: { name: "asc" } },
      },
      assignments: {
        include: {
          subject: { select: { name: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });
  if (!cls) return "Turma não encontrada.";

  const studentLines = await Promise.all(
    cls.students.map(async (student) => {
      const [avg, absences] = await Promise.all([
        prisma.grade.aggregate({
          _avg: { value: true },
          where: { studentId: student.id, year: cls.year },
        }),
        prisma.attendance.count({ where: { studentId: student.id, present: false } }),
      ]);
      const media = avg._avg.value !== null ? Math.round(avg._avg.value * 10) / 10 : "sem notas";
      return `  - ${student.user.name}: média ${media}, ${absences} faltas, responsável ${student.guardian?.user.name ?? "não informado"}`;
    }),
  );

  const assignmentLines =
    cls.assignments
      .map((a) => `  - ${a.subject.name}: ${a.teacher.user.name}`)
      .join("\n") || "  (sem vinculos)";

  return [
    `TURMA: ${cls.name} (${cls.year})`,
    `Turno: ${humanizeEnum(cls.shift)}`,
    `Total de alunos: ${cls.students.length}`,
    `Vinculos docentes:\n${assignmentLines}`,
    `Alunos:\n${studentLines.join("\n") || "  (sem alunos)"}`,
  ].join("\n");
}

/** Constrói o contexto de dados reais que será enviado ao agente. */
async function buildContext(agentType: AgentType, profile: ProfileIds, studentId?: string): Promise<string> {
  switch (agentType) {
    case "GESTOR": {
      const s = await getDirectorStats();
      const byClass = s.averagesByClass.map((c) => `  - ${c.name}: ${c.media}`).join("\n");
      const risk = s.atRisk.map((a) => `  - ${a.name} (${a.className}): média ${a.media}`).join("\n") || "  (nenhum)";
      const abs = s.manyAbsences.map((a) => `  - ${a.name} (${a.className}): ${a.absences} faltas`).join("\n") || "  (nenhum)";
      return [
        "DADOS GERAIS DA ESCOLA:",
        `Total de alunos: ${s.students} | Professores: ${s.teachers} | Turmas: ${s.classes}`,
        `Média geral da escola: ${s.schoolAverage ?? "sem dados"}`,
        `Médias por turma:\n${byClass}`,
        `Alunos em risco (média < 6):\n${risk}`,
        `Alunos com muitas faltas:\n${abs}`,
      ].join("\n");
    }
    case "PEDAGOGICO": {
      if (studentId) return "DADOS DO ALUNO PARA ANÁLISE PEDAGÓGICA:\n" + (await describeStudent(studentId));
      const s = await getDirectorStats();
      const risk = s.atRisk.map((a) => `  - ${a.name} (${a.className}): média ${a.media}`).join("\n") || "  (nenhum)";
      return `Visão geral pedagógica. Alunos em risco:\n${risk}\nSelecione um aluno para uma análise individual detalhada.`;
    }
    case "PROFESSOR": {
      if (!profile.teacherId) return "Professor sem turmas vinculadas.";
      if (studentId && (await teacherCanManage(profile.teacherId, (await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } }))?.classId ?? ""))) {
        return "DADOS DO ALUNO DA SUA TURMA:\n" + (await describeStudent(studentId));
      }
      const [classes, subjects, perf] = await Promise.all([
        getTeacherClasses(profile.teacherId),
        getTeacherSubjects(profile.teacherId),
        getTeacherClassPerformance(profile.teacherId),
      ]);
      return [
        "CONTEXTO DO PROFESSOR:",
        `Turmas: ${classes.map((c) => c.name).join(", ") || "nenhuma"}`,
        `Disciplinas: ${subjects.map((s) => s.name).join(", ") || "nenhuma"}`,
        `Desempenho das turmas:\n${perf.map((p) => `  - ${p.name}: ${p.media}`).join("\n")}`,
      ].join("\n");
    }
    case "TUTOR": {
      if (!profile.studentId) return "Aluno sem dados disponíveis.";
      return "MEUS DADOS ESCOLARES:\n" + (await describeStudent(profile.studentId));
    }
    case "FAMILIAR": {
      // Garante que o aluno consultado seja filho do responsável
      let targetId = studentId;
      if (profile.guardianId) {
        const child = await prisma.student.findFirst({
          where: { guardianId: profile.guardianId, ...(studentId ? { id: studentId } : {}) },
          select: { id: true },
        });
        targetId = child?.id;
      }
      if (!targetId) return "Nenhum aluno vinculado a este responsável.";
      return "DADOS DO MEU FILHO(A):\n" + (await describeStudent(targetId));
    }
    default:
      return "Sem contexto disponível.";
  }
}

/** Executa o agente: monta contexto, chama a IA e persiste a interação. */
async function buildReportContext(scope: ReportScope, classId?: string | null, studentId?: string | null) {
  if (scope === "ESCOLA") return describeSchoolOverview();
  if (scope === "TURMA") return describeClass(classId ?? "");
  return describeStudent(studentId ?? "");
}

function reportScopeLabel(scope: ReportScope) {
  if (scope === "ESCOLA") return "escola";
  if (scope === "TURMA") return "turma";
  return "aluno";
}

export async function generateAgentResponse(params: {
  profile: ProfileIds;
  agentType: AgentType;
  message: string;
  studentId?: string;
}) {
  const { profile, agentType, message, studentId } = params;
  const agent = AGENTS[agentType];

  const context = await buildContext(agentType, profile, studentId);
  const userPrompt = `${context}\n\n---\nPERGUNTA DO USUÁRIO:\n${message}`;

  const result = await callAi({ system: agent.systemPrompt, user: userPrompt });

  await prisma.aiInteraction.create({
    data: {
      userId: profile.id,
      agent: agentType,
      question: message,
      answer: result.answer,
      model: result.model,
      studentId: studentId || null,
    },
  });

  return result;
}

/** Gera e persiste um relatorio escolar pelo Agente Gestor. */
export async function generateManagerSchoolReport(params: {
  profile: ProfileIds;
  title?: string;
  scope: ReportScope;
  period?: string;
  classId?: string | null;
  studentId?: string | null;
}) {
  const { profile, scope, period, classId, studentId } = params;
  const agent = AGENTS.GESTOR;
  const context = await buildReportContext(scope, classId, studentId);
  const title =
    params.title?.trim() ||
    `Relatório ${reportScopeLabel(scope)}${period?.trim() ? ` - ${period.trim()}` : ""}`;

  const prompt = [
    context,
    "",
    "---",
    "TAREFA:",
    `Gere um relatório de gestão escolar para o escopo ${reportScopeLabel(scope)}.`,
    period?.trim() ? `Período informado: ${period.trim()}.` : "Período não informado.",
    "Estruture com: resumo executivo, indicadores principais, pontos de atenção, recomendações e próximos passos.",
    "Use apenas os dados do contexto. Se algum dado estiver ausente, sinalize a ausência.",
  ].join("\n");

  const result = await callAi({ system: agent.systemPrompt, user: prompt });

  const report = await prisma.schoolReport.create({
    data: {
      title,
      scope,
      period: period?.trim() || null,
      content: result.answer,
      authorId: profile.id,
      classId: scope === "TURMA" ? classId ?? null : null,
      studentId: scope === "ALUNO" ? studentId ?? null : null,
    },
  });

  await prisma.aiInteraction.create({
    data: {
      userId: profile.id,
      agent: "GESTOR",
      question: `Gerar relatório ${reportScopeLabel(scope)}: ${title}`,
      answer: result.answer,
      model: result.model,
      studentId: scope === "ALUNO" ? studentId ?? null : null,
    },
  });

  return { report, result };
}
