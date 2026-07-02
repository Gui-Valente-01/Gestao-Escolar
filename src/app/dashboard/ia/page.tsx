import { requireUser, getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AGENTS, AGENT_BY_ROLE, AGENT_SLUG_BY_ROLE, isAiConfigured } from "@/lib/ai";
import { listStudents, getGuardianStudents } from "@/services/student.service";
import { getTeacherStudents } from "@/services/teacher.service";
import { PageHeader } from "@/components/ui/PageHeader";
import { AiChatBox } from "@/components/ai/AiChatBox";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

const STARTERS: Record<string, string[]> = {
  GESTOR: ["Gere o relatório geral da escola", "Quais turmas estão com baixo desempenho?", "Liste os alunos em risco"],
  PEDAGOGICO: ["Crie um plano de recuperação para o aluno selecionado", "Analise o histórico deste aluno", "Identifique padrões de queda no desempenho"],
  PROFESSOR: ["Crie uma prova de matemática", "Sugira um plano de aula", "Resuma o desempenho da turma"],
  TUTOR: ["Crie um plano de estudos para mim", "Explique frações de forma simples", "Faça um resumo para a prova"],
  FAMILIAR: ["Resuma a situação escolar do meu filho", "Como posso ajudar em casa?", "Há algum alerta importante?"],
};

export default async function AiPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const agentType = AGENT_BY_ROLE[user.role] ?? "GESTOR";
  const agent = AGENTS[agentType];
  const slug = AGENT_SLUG_BY_ROLE[user.role];

  // Define a lista de alunos disponível como contexto, conforme o perfil
  let students: { id: string; name: string }[] = [];
  if (["ADMIN", "DIRETOR", "PEDAGOGA"].includes(user.role)) {
    students = (await listStudents()).map((s) => ({ id: s.id, name: s.user.name }));
  } else if (user.role === "PROFESSOR" && profile?.teacherId) {
    students = (await getTeacherStudents(profile.teacherId)).map((s) => ({ id: s.id, name: s.user.name }));
  } else if (user.role === "RESPONSAVEL" && profile?.guardianId) {
    students = (await getGuardianStudents(profile.guardianId)).map((s) => ({ id: s.id, name: s.user.name }));
  }

  const history = await prisma.aiInteraction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistente de IA"
        subtitle={agent.description}
        action={
          <Badge tone={isAiConfigured() ? "emerald" : "amber"}>
            {isAiConfigured() ? "IA conectada" : "Modo demonstração"}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AiChatBox
            slug={slug}
            agentName={agent.name}
            description={agent.description}
            students={students}
            starters={STARTERS[agentType]}
          />
        </div>

        <div className="card flex flex-col p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Histórico de interações</h3>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-slate-400">Nenhuma interação ainda. Faça sua primeira pergunta!</p>}
            {history.map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{h.question}</p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-400">{h.answer}</p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(h.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
