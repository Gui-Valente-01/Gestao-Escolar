"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Role } from "@prisma/client";
import { userSchema } from "@/validations";
import { ALL_ROLES, ROLE_LABELS, ROLE_BADGE } from "@/lib/permissions";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { formatDate, cn } from "@/lib/utils";
import { createUser, updateUser, deleteUser } from "./actions";

type Row = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string; classId: string | null };
type Option = { id: string; name: string };
type FormValues = {
  name: string;
  email: string;
  role: Role;
  password?: string;
  active: boolean;
  classId?: string;
};

export function UsuariosManager({
  users,
  classes,
  query,
  pagination,
}: {
  users: Row[];
  classes: Option[];
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(userSchema), defaultValues: { active: true, role: "ALUNO" } });
  const selectedRole = watch("role");

  function openNew() {
    setEditing(null);
    setServerError(null);
    reset({ name: "", email: "", role: "ALUNO", password: "", active: true, classId: "" });
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setServerError(null);
    reset({ name: row.name, email: row.email, role: row.role, password: "", active: row.active, classId: row.classId ?? "" });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = editing ? await updateUser(editing.id, values) : await createUser(values);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onDelete(row: Row) {
    if (!confirm(`Excluir o usuário "${row.name}"? Esta ação não pode ser desfeita.`)) return;
    const res = await deleteUser(row.id);
    if (!res.ok) alert(res.error);
    else router.refresh();
  }

  const columns: Column<Row>[] = [
    { key: "name", header: "Nome", render: (u) => <span className="font-medium text-slate-800 dark:text-white">{u.name}</span> },
    { key: "email", header: "E-mail" },
    {
      key: "role",
      header: "Perfil",
      render: (u) => <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE[u.role])}>{ROLE_LABELS[u.role]}</span>,
    },
    {
      key: "active",
      header: "Status",
      render: (u) =>
        u.active ? (
          <span className="text-xs font-medium text-emerald-500">Ativo</span>
        ) : (
          <span className="text-xs font-medium text-slate-400">Inativo</span>
        ),
    },
    { key: "createdAt", header: "Criado em", render: (u) => formatDate(u.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-500/10 hover:text-brand-600" aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(u)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-600" aria-label="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Buscar por nome, e-mail..."
        getSearchText={(u) => `${u.name} ${u.email} ${ROLE_LABELS[u.role]}`}
        initialSearch={query}
        serverPagination={pagination}
        toolbar={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar usuário" : "Novo usuário"}
        description={editing ? "Atualize os dados do usuário." : "Preencha os dados para criar o usuário."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput label="Nome completo" error={errors.name?.message} {...register("name")} />
          <FormInput label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
          <SelectInput
            label="Perfil"
            error={errors.role?.message}
            options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            {...register("role")}
          />
          {selectedRole === "ALUNO" && (
            <SelectInput
              label="Turma"
              placeholder="Selecione a turma"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.classId?.message}
              {...register("classId")}
            />
          )}
          <FormInput
            label={editing ? "Nova senha (opcional)" : "Senha"}
            type="password"
            placeholder={editing ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
            error={errors.password?.message}
            {...register("password")}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("active")} />
            Usuário ativo
          </label>
          {serverError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{serverError}</p>}
        </form>
      </Modal>
    </>
  );
}
