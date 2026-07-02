"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { teacherSchema, type TeacherInput } from "@/validations";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { createTeacher, updateTeacher, deleteTeacher } from "./actions";

type Row = {
  id: string;
  name: string;
  email: string;
  registration: string | null;
  phone: string | null;
  subjects: number;
};

export function ProfessoresManager({
  teachers,
  query,
  pagination,
}: {
  teachers: Row[];
  query: string;
  pagination: { page: number; pageSize: number; total: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherInput>({ resolver: zodResolver(teacherSchema) });

  function openNew() {
    setEditing(null);
    setServerError(null);
    reset({ name: "", email: "", password: "", registration: "", phone: "" });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setServerError(null);
    reset({ name: row.name, email: row.email, password: "", registration: row.registration ?? "", phone: row.phone ?? "" });
    setOpen(true);
  }
  async function onSubmit(values: TeacherInput) {
    const res = editing ? await updateTeacher(editing.id, values) : await createTeacher(values);
    if (!res.ok) return setServerError(res.error);
    setOpen(false);
    router.refresh();
  }
  async function onDelete(row: Row) {
    if (!confirm(`Excluir o professor "${row.name}"? Notas e vínculos serão removidos.`)) return;
    const res = await deleteTeacher(row.id);
    if (!res.ok) alert(res.error);
    else router.refresh();
  }

  const columns: Column<Row>[] = [
    { key: "name", header: "Nome", render: (t) => <span className="font-medium text-slate-800 dark:text-white">{t.name}</span> },
    { key: "email", header: "E-mail" },
    { key: "registration", header: "Matrícula", render: (t) => t.registration ?? "—" },
    { key: "phone", header: "Telefone", render: (t) => t.phone ?? "—" },
    { key: "subjects", header: "Disciplinas" },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-500/10 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(t)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={teachers}
        columns={columns}
        getSearchText={(t) => `${t.name} ${t.email} ${t.registration ?? ""}`}
        initialSearch={query}
        serverPagination={pagination}
        toolbar={<Button onClick={openNew}><Plus className="h-4 w-4" /> Novo professor</Button>}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar professor" : "Novo professor"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput label="Nome completo" error={errors.name?.message} {...register("name")} />
          <FormInput label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Matrícula funcional" error={errors.registration?.message} {...register("registration")} />
            <FormInput label="Telefone" error={errors.phone?.message} {...register("phone")} />
          </div>
          <FormInput
            label={editing ? "Nova senha (opcional)" : "Senha"}
            type="password"
            placeholder={editing ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
            error={errors.password?.message}
            {...register("password")}
          />
          {serverError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{serverError}</p>}
        </form>
      </Modal>
    </>
  );
}
