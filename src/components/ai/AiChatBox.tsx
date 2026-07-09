"use client";

import { useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface StudentOption {
  id: string;
  name: string;
}

export function AiChatBox({
  slug,
  agentName,
  description,
  students,
  starters = [],
}: {
  slug: string;
  agentName: string;
  description: string;
  students?: StudentOption[];
  starters?: string[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(message: string) {
    if (!message.trim() || loading) return;
    setError(null);
    setInput("");
    const next = [...messages, { role: "user" as const, content: message }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, studentId: studentId || undefined }),
      });
      // Lê como texto e faz parse seguro (resposta pode vir vazia em timeout)
      const raw = await res.text();
      let data: { ok?: boolean; answer?: string; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!res.ok || !data?.ok) {
        const timedOut = res.status === 504 || res.status === 408 || (!data && res.status >= 500);
        throw new Error(
          data?.error ||
            (timedOut
              ? "A IA demorou demais para responder (tempo esgotado). Tente uma pergunta mais curta ou tente novamente."
              : `Falha ao consultar a IA (código ${res.status}).`),
        );
      }
      setMessages([...next, { role: "assistant", content: data.answer ?? "Sem resposta." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setMessages(next);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="card flex h-[calc(100vh-12rem)] min-h-[480px] flex-col overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800 dark:text-white">{agentName}</h3>
          <p className="truncate text-xs text-slate-400">{description}</p>
        </div>
        {students && students.length > 0 && (
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="input-base h-9 w-44 text-xs"
          >
            <option value="">Sem aluno (geral)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <Bot className="h-8 w-8" />
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              Faça uma pergunta para o {agentName}. As respostas usam dados reais do banco de dados.
            </p>
            {starters.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-white/10 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                m.role === "user" ? "bg-brand-600 text-white" : "bg-violet-500/15 text-violet-500",
              )}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-tr-sm bg-brand-600 text-white"
                  : "rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-200",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-white/5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-500">{error}</p>}

      {/* Entrada */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          className="input-base"
          disabled={loading}
        />
        <Button type="submit" size="icon" loading={loading} aria-label="Enviar">
          {!loading && <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
