"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { studentSchema, type StudentInput } from "@/validations";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { createStudent, updateStudent, deleteStudent } from "./actions";

interface Option { id: string; name: string }
type Row = {
  id: string;
  name: string;
  email: string;
  registration: string;
  birthDate: string | null;
  className: string | null;
  classId: string | null;
  guardianName: string | null;
  guardianId: string | null;
};

export function AlunosManager({
  students,
  classes,
  guardians,
  query,
  pagination,
}: {
  students: Row[];
  classes: Option[];
  guardians: Option[];
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
  } = useForm<StudentInput>({ resolver: zodResolver(studentSchema) });

  function openNew() {
    setEditing(null);
    setServerError(null);
    reset({ name: "", email: "", password: "", registration: "", birthDate: "", classId: "", guardianId: "" });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setServerError(null);
    reset({
      name: row.name,
      email: row.email,
      password: "",
      registration: row.registration,
      birthDate: row.birthDate ? row.birthDate.slice(0, 10) : "",
      classId: row.classId ?? "",
      guardianId: row.guardianId ?? "",
    });
    setOpen(true);
  }
  async function onSubmit(values: StudentInput) {
    const res = editing ? await updateStudent(editing.id, values) : await createStudent(values);
    if (!res.ok) return setServerError(res.error);
    setOpen(false);
    router.refresh();
  }
  async function onDelete(row: Row) {
    if (!confirm(`Excluir o aluno "${row.name}"? Notas, faltas e registros serão removidos.`)) return;
    const res = await deleteStudent(row.id);
    if (!res.ok) alert(res.error);
    else router.refresh();
  }

  const columns: Column<Row>[] = [
    { key: "name", header: "Nome", render: (s) => <span className="font-medium text-slate-800 dark:text-white">{s.name}</span> },
    { key: "registration", header: "Matrícula" },
    { key: "className", header: "Turma", render: (s) => (s.className ? <Badge tone="brand">{s.className}</Badge> : <span className="text-slate-400">Sem turma</span>) },
    { key: "guardianName", header: "Responsável", render: (s) => s.guardianName ?? "—" },
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
        data={students}
        columns={columns}
        getSearchText={(s) => `${s.name} ${s.email} ${s.registration} ${s.className ?? ""} ${s.guardianName ?? ""}`}
        initialSearch={query}
        serverPagination={pagination}
        toolbar={<Button onClick={openNew}><Plus className="h-4 w-4" /> Novo aluno</Button>}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar aluno" : "Novo aluno"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Nome completo" error={errors.name?.message} {...register("name")} />
            <FormInput label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Matrícula" error={errors.registration?.message} {...register("registration")} />
            <FormInput label="Data de nascimento" type="date" error={errors.birthDate?.message} {...register("birthDate")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Turma" placeholder="Sem turma" options={classes.map((c) => ({ value: c.id, label: c.name }))} error={errors.classId?.message} {...register("classId")} />
            <SelectInput label="Responsável" placeholder="Sem responsável" options={guardians.map((g) => ({ value: g.id, label: g.name }))} error={errors.guardianId?.message} {...register("guardianId")} />
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
