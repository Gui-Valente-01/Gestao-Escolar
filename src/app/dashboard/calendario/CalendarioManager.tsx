"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { eventSchema, type EventInput } from "@/validations";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormInput, FormTextarea } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { useToast } from "@/components/providers/ToastProvider";
import { createEvent, deleteEvent } from "./actions";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  audience: string;
  className: string | null;
  author: string;
  canDelete: boolean;
}

const TYPE_META: Record<string, { label: string; tone: "red" | "brand" | "emerald" | "amber" | "violet" | "sky" }> = {
  PROVA: { label: "Prova", tone: "red" },
  REUNIAO: { label: "Reunião", tone: "brand" },
  FERIADO: { label: "Feriado", tone: "emerald" },
  ENTREGA: { label: "Entrega", tone: "amber" },
  EVENTO: { label: "Evento", tone: "violet" },
  RECESSO: { label: "Recesso", tone: "sky" },
};

const AUDIENCE_LABEL: Record<string, string> = {
  TODOS: "Todos",
  PROFESSORES: "Professores",
  RESPONSAVEIS: "Responsáveis",
  ALUNOS: "Alunos",
  TURMA: "Turma",
};

function fmtDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  if (allDay) return date;
  return `${date} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CalendarioManager({
  events,
  classes,
  canManage,
}: {
  events: EventRow[];
  classes: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "EVENTO", audience: "TODOS", allDay: true },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const key = monthKey(e.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [events]);

  async function onSubmit(values: EventInput) {
    const res = await createEvent(values);
    if (!res.ok) {
      showToast({ tone: "error", title: res.error });
      return;
    }
    showToast({ tone: "success", title: res.message ?? "Evento criado." });
    reset({ type: "EVENTO", audience: "TODOS", allDay: true });
    setOpen(false);
    router.refresh();
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteEvent(id);
      showToast({ tone: res.ok ? "success" : "error", title: res.ok ? (res.message ?? "Removido.") : res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <CalendarDays className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum evento no calendário ainda.</p>
        </div>
      ) : (
        grouped.map(([month, rows]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{month}</h2>
            <div className="space-y-3">
              {rows.map((e) => {
                const meta = TYPE_META[e.type] ?? { label: e.type, tone: "slate" as const };
                return (
                  <div key={e.id} className="card flex items-start gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                      <span className="text-lg font-bold leading-none">{new Date(e.startsAt).getDate()}</span>
                      <span className="text-[10px] uppercase">
                        {new Date(e.startsAt).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-white">{e.title}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {e.className ? (
                          <Badge tone="slate">{e.className}</Badge>
                        ) : (
                          <Badge tone="slate">{AUDIENCE_LABEL[e.audience] ?? e.audience}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{fmtDate(e.startsAt, e.allDay)}</p>
                      {e.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{e.description}</p>}
                      <p className="mt-1 text-xs text-slate-400">Por {e.author}</p>
                    </div>
                    {e.canDelete && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        disabled={pending}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                        aria-label="Excluir evento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo evento" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput label="Título" error={errors.title?.message} {...register("title")} />
          <FormTextarea label="Descrição (opcional)" error={errors.description?.message} {...register("description")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Tipo"
              error={errors.type?.message}
              options={Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }))}
              {...register("type")}
            />
            <SelectInput
              label="Público"
              error={errors.audience?.message}
              options={[
                { value: "TODOS", label: "Todos" },
                { value: "ALUNOS", label: "Alunos" },
                { value: "RESPONSAVEIS", label: "Responsáveis" },
                { value: "PROFESSORES", label: "Professores" },
              ]}
              {...register("audience")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Início" type="datetime-local" error={errors.startsAt?.message} {...register("startsAt")} />
            <FormInput label="Término (opcional)" type="datetime-local" error={errors.endsAt?.message} {...register("endsAt")} />
          </div>
          <SelectInput
            label="Turma (opcional — deixe vazio para evento geral)"
            placeholder="Evento geral da escola"
            error={errors.classId?.message}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            {...register("classId")}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("allDay")} />
            Dia inteiro (ignora o horário)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
