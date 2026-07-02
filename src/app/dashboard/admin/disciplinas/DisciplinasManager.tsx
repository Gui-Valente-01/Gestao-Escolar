"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { subjectSchema, type SubjectInput } from "@/validations";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { createSubject, updateSubject, deleteSubject } from "./actions";

type Row = { id: string; name: string; code: string | null; workload: number | null; teachers: number };

export function DisciplinasManager({ subjects }: { subjects: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectInput>({ resolver: zodResolver(subjectSchema) });

  function openNew() {
    setEditing(null);
    setServerError(null);
    reset({ name: "", code: "", workload: undefined });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setServerError(null);
    reset({ name: row.name, code: row.code ?? "", workload: row.workload ?? undefined });
    setOpen(true);
  }
  async function onSubmit(values: SubjectInput) {
    const res = editing ? await updateSubject(editing.id, values) : await createSubject(values);
    if (!res.ok) return setServerError(res.error);
    setOpen(false);
    router.refresh();
  }
  async function onDelete(row: Row) {
    if (!confirm(`Excluir a disciplina "${row.name}"?`)) return;
    const res = await deleteSubject(row.id);
    if (!res.ok) alert(res.error);
    else router.refresh();
  }

  const columns: Column<Row>[] = [
    { key: "name", header: "Disciplina", render: (s) => <span className="font-medium text-slate-800 dark:text-white">{s.name}</span> },
    { key: "code", header: "Código", render: (s) => s.code ?? "—" },
    { key: "workload", header: "Carga horária", render: (s) => (s.workload ? `${s.workload}h` : "—") },
    { key: "teachers", header: "Professores", render: (s) => `${s.teachers}` },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-500/10 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(s)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={subjects}
        columns={columns}
        getSearchText={(s) => `${s.name} ${s.code ?? ""}`}
        toolbar={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nova disciplina</Button>}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar disciplina" : "Nova disciplina"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput label="Nome" error={errors.name?.message} {...register("name")} />
          <FormInput label="Código (opcional)" error={errors.code?.message} {...register("code")} />
          <FormInput label="Carga horária (horas)" type="number" error={errors.workload?.message} {...register("workload")} />
          {serverError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{serverError}</p>}
        </form>
      </Modal>
    </>
  );
}
