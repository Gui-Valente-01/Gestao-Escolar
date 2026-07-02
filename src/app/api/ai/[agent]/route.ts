import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { AGENTS, AGENT_BY_SLUG } from "@/lib/ai";
import { aiAskSchema } from "@/validations";
import { generateAgentResponse } from "@/services/ai.service";
import { logAction } from "@/lib/audit";

// Endpoint dos agentes de IA:
//   /api/ai/director | pedagogue | teacher | student | guardian
export async function POST(req: Request, { params }: { params: { agent: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const agentType = AGENT_BY_SLUG[params.agent];
  if (!agentType) {
    return NextResponse.json({ ok: false, error: "Agente desconhecido" }, { status: 404 });
  }

  // Controle de acesso: a role precisa ter permissão para usar o agente
  const agent = AGENTS[agentType];
  if (!agent.roles.includes(profile.role)) {
    return NextResponse.json({ ok: false, error: "Você não tem acesso a este agente." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = aiAskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Mensagem inválida" }, { status: 400 });
  }

  try {
    const result = await generateAgentResponse({
      profile,
      agentType,
      message: parsed.data.message,
      studentId: parsed.data.studentId || undefined,
    });

    await logAction({
      userId: profile.id,
      action: "ai.query",
      entity: "AiInteraction",
      metadata: { agent: agentType, model: result.model },
    });

    return NextResponse.json({ ok: true, answer: result.answer, model: result.model });
  } catch (err) {
    console.error("[ai] erro:", err);
    return NextResponse.json(
      { ok: false, error: "Falha ao consultar a IA. Verifique a configuração do provider." },
      { status: 500 },
    );
  }
}
