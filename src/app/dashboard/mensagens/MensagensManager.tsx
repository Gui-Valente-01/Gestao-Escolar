"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/providers/ToastProvider";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { sendMessageAction } from "./actions";

interface Conversation {
  otherId: string;
  name: string;
  role: Role;
  lastBody: string;
  lastAt: string;
  unread: number;
}
interface Contact {
  id: string;
  name: string;
  role: Role;
}
interface Selected {
  otherId: string;
  otherName: string;
  otherRole: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
}

function time(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function MensagensManager({
  currentUserId,
  conversations,
  contacts,
  selected,
}: {
  currentUserId: string;
  conversations: Conversation[];
  contacts: Contact[];
  selected: Selected | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selected]);

  function openConversation(otherId: string) {
    router.push(`/dashboard/mensagens?with=${otherId}`);
  }

  function send() {
    if (!selected || !body.trim() || pending) return;
    const text = body;
    setBody("");
    startTransition(async () => {
      const res = await sendMessageAction({ recipientId: selected.otherId, body: text });
      if (!res.ok) {
        showToast({ tone: "error", title: res.error });
        setBody(text);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Lista de conversas / contatos */}
      <div className="card flex flex-col overflow-hidden lg:h-[calc(100vh-13rem)]">
        <div className="border-b border-slate-200 p-3 dark:border-white/10">
          <select
            value=""
            onChange={(e) => e.target.value && openConversation(e.target.value)}
            className="input-base h-10 text-sm"
          >
            <option value="">+ Nova conversa...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {ROLE_LABELS[c.role]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-400">Nenhuma conversa ainda. Inicie uma acima.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.otherId}
              onClick={() => openConversation(c.otherId)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5",
                selected?.otherId === c.otherId && "bg-brand-500/10",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{c.name}</p>
                  {c.unread > 0 && <Badge tone="brand">{c.unread}</Badge>}
                </div>
                <p className="truncate text-xs text-slate-400">{c.lastBody}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversa selecionada */}
      <div className="card flex flex-col overflow-hidden lg:col-span-2 lg:h-[calc(100vh-13rem)]">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
            <MessageSquare className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Selecione uma conversa ou inicie uma nova.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 p-3 dark:border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
                {initials(selected.otherName)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{selected.otherName}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[selected.otherRole as Role]}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {selected.messages.length === 0 && (
                <p className="text-center text-sm text-slate-400">Nenhuma mensagem ainda. Diga olá! 👋</p>
              )}
              {selected.messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "rounded-br-sm bg-brand-600 text-white"
                          : "rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-200",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-slate-400")}>{time(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-white/10"
            >
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva sua mensagem..."
                className="input-base"
                disabled={pending}
              />
              <Button type="submit" size="icon" loading={pending} aria-label="Enviar">
                {!pending && <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
