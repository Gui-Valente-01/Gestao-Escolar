import type { AgentType, Role } from "@prisma/client";
import type { AgentConfig } from "@/types";

// ----------------------------------------------------------------------------
// Definição dos agentes de IA
// Cada agente tem nome, roles permitidas e prompt de sistema próprio.
// ----------------------------------------------------------------------------

export const AGENTS: Record<AgentType, AgentConfig> = {
  GESTOR: {
    type: "GESTOR",
    name: "Agente Gestor",
    roles: ["ADMIN", "DIRETOR"],
    description:
      "Gera relatórios gerais, identifica turmas com baixo desempenho e alunos em risco, e sugere ações administrativas.",
    systemPrompt: `Você é o "Agente Gestor", um assistente de gestão escolar para a direção.
Receba dados reais da escola (totais, médias, turmas e alunos em risco) e produza análises objetivas.
Sempre responda em português do Brasil, de forma estruturada (use tópicos), com foco em decisões administrativas.
Identifique turmas com baixo desempenho, alunos em risco (notas baixas ou muitas faltas) e sugira ações concretas.
Nunca invente dados que não estejam no contexto fornecido.`,
  },
  PEDAGOGICO: {
    type: "PEDAGOGICO",
    name: "Agente Pedagógico",
    roles: ["ADMIN", "PEDAGOGA"],
    description:
      "Analisa o histórico do aluno, cria planos de recuperação e identifica padrões de queda no desempenho.",
    systemPrompt: `Você é o "Agente Pedagógico", assistente da equipe pedagógica.
Analise o histórico do aluno (notas, faltas, ocorrências e acompanhamentos) e gere orientações pedagógicas.
Responda em português do Brasil. Crie planos de apoio/recuperação claros, com objetivos, ações e prazos.
Identifique padrões de queda de desempenho e proponha intervenções. Seja empático e técnico.
Baseie-se apenas nos dados do contexto.`,
  },
  PROFESSOR: {
    type: "PROFESSOR",
    name: "Agente Professor",
    roles: ["ADMIN", "PROFESSOR"],
    description:
      "Cria atividades, provas, exercícios de recuperação e planos de aula, e sugere estratégias de ensino.",
    systemPrompt: `Você é o "Agente Professor", assistente didático do docente.
Crie atividades, provas, exercícios de recuperação e planos de aula adequados à turma e disciplina informadas.
Responda em português do Brasil, com enunciados claros e, quando fizer prova, inclua gabarito ao final.
Use o desempenho da turma do contexto para calibrar a dificuldade e sugerir estratégias de ensino.`,
  },
  TUTOR: {
    type: "TUTOR",
    name: "Agente Tutor",
    roles: ["ADMIN", "ALUNO"],
    description:
      "Explica conteúdos, cria planos de estudo, ajuda em dúvidas e sugere exercícios de revisão.",
    systemPrompt: `Você é o "Agente Tutor", um tutor de estudos para o aluno.
Explique conteúdos de forma simples e motivadora, crie planos de estudo e resumos para prova, e proponha exercícios.
Responda em português do Brasil, com linguagem acessível à idade escolar. Incentive o aluno.
Use as notas e disciplinas do contexto para priorizar os pontos que o aluno precisa reforçar.`,
  },
  FAMILIAR: {
    type: "FAMILIAR",
    name: "Agente Familiar",
    roles: ["ADMIN", "RESPONSAVEL"],
    description:
      "Resume o desempenho do filho, explica a situação escolar e sugere como ajudar em casa.",
    systemPrompt: `Você é o "Agente Familiar", assistente para os responsáveis.
Resuma o desempenho escolar do(a) filho(a) em linguagem simples, explique a situação e sugira formas de apoio em casa.
Responda em português do Brasil. Alerte com sensibilidade sobre notas baixas e excesso de faltas.
Baseie-se somente nos dados do contexto fornecido.`,
  },
};

/** Mapeia a role do usuário ao agente de IA correspondente. */
export const AGENT_BY_ROLE: Record<Role, AgentType | null> = {
  ADMIN: "GESTOR",
  DIRETOR: "GESTOR",
  PEDAGOGA: "PEDAGOGICO",
  PROFESSOR: "PROFESSOR",
  ALUNO: "TUTOR",
  RESPONSAVEL: "FAMILIAR",
};

/** Mapeia a role do usuário ao slug da rota /api/ai/[agent]. */
export const AGENT_SLUG_BY_ROLE: Record<Role, string> = {
  ADMIN: "director",
  DIRETOR: "director",
  PEDAGOGA: "pedagogue",
  PROFESSOR: "teacher",
  ALUNO: "student",
  RESPONSAVEL: "guardian",
};

/** Mapeia o slug da rota /api/ai/[agent] ao tipo de agente. */
export const AGENT_BY_SLUG: Record<string, AgentType> = {
  director: "GESTOR",
  diretor: "GESTOR",
  pedagogue: "PEDAGOGICO",
  pedagoga: "PEDAGOGICO",
  teacher: "PROFESSOR",
  professor: "PROFESSOR",
  student: "TUTOR",
  aluno: "TUTOR",
  guardian: "FAMILIAR",
  responsavel: "FAMILIAR",
};

// ----------------------------------------------------------------------------
// Cliente de IA configurável (compatível com OpenAI Chat Completions)
// ----------------------------------------------------------------------------

export interface AiResult {
  answer: string;
  model: string;
  provider: string;
}

export interface AiTurn {
  role: "user" | "assistant";
  content: string;
}

interface CallOptions {
  system: string;
  user: string;
  history?: AiTurn[];
}

const AI_TIMEOUT_MS = 45_000;

export function isAiConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const key =
    provider === "gemini"
      ? process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      : process.env.AI_API_KEY;

  return Boolean(key && key.length > 8);
}

/**
 * Executa uma chamada à IA usando o provider definido nas variáveis de ambiente.
 * Funciona com qualquer endpoint compatível com a API OpenAI Chat Completions,
 * e também com a API de Mensagens da Anthropic (AI_PROVIDER=anthropic).
 * Sem chave configurada, retorna uma resposta de fallback informativa.
 */
export async function callAi({ system, user, history = [] }: CallOptions): Promise<AiResult> {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const model = process.env.AI_MODEL || (provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini");
  const baseUrl =
    process.env.AI_BASE_URL ||
    (provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta" : "https://api.openai.com/v1");
  const apiKey =
    provider === "gemini"
      ? process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ""
      : process.env.AI_API_KEY || "";
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 1200);

  if (!isAiConfigured()) {
    return {
      answer: buildFallbackAnswer(user),
      model: "offline-fallback",
      provider: "none",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    if (provider === "gemini") {
      const modelPath = model.startsWith("models/") ? model : `models/${model}`;
      const url = new URL(`${baseUrl.replace(/\/$/, "")}/${modelPath}:generateContent`);
      url.searchParams.set("key", apiKey);

      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            ...history.map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
            { role: "user", parts: [{ text: user }] },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: maxTokens,
          },
        }),
      });
      if (!res.ok) throw new Error(`IA respondeu ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const answer = extractGeminiText(data);
      if (!answer) {
        const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
        throw new Error(reason ? `Gemini sem texto de resposta (${reason})` : "Gemini sem texto de resposta.");
      }
      return { answer, model, provider };
    }

    if (provider === "anthropic") {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [...history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`IA respondeu ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const answer = data?.content?.[0]?.text?.trim() || "Sem resposta da IA.";
      return { answer, model, provider };
    }

    // Padrão: OpenAI-compatible
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`IA respondeu ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "Sem resposta da IA.";
    return { answer, model, provider };
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";

  return candidates
    .flatMap((candidate) => {
      const parts = (candidate as { content?: { parts?: unknown } })?.content?.parts;
      return Array.isArray(parts) ? parts : [];
    })
    .map((part) => (typeof (part as { text?: unknown })?.text === "string" ? (part as { text: string }).text : ""))
    .join("")
    .trim();
}

/**
 * Resposta usada quando nenhuma chave de IA está configurada.
 * Mantém o produto funcional para demonstração, ecoando o contexto recebido.
 */
function buildFallbackAnswer(userPrompt: string): string {
  return [
    "⚠️ **IA em modo demonstração** — nenhuma chave foi configurada.",
    "Defina `AI_PROVIDER`, `AI_API_KEY` (ou `GEMINI_API_KEY` para Gemini), `AI_BASE_URL` e `AI_MODEL` no arquivo `.env` para ativar as respostas reais do modelo.",
    "",
    "Enquanto isso, este é o contexto real coletado do banco de dados que seria enviado ao agente:",
    "",
    "```",
    userPrompt.slice(0, 1500),
    "```",
  ].join("\n");
}
