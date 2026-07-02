"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { classSchema, type ClassInput } from "@/validations";
import { humanizeEnum } from "@/lib/utils";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormInput } from "@/components/forms/FormInput";
import { SelectInput } from "@/components/forms/SelectInput";
import { createClass, updateClass, deleteClass, createAssignment, deleteAssignment } from "./actions";

interface Assignment {
  id: string;
  subject: string;
  teacher: string;
}
interface Row {
  id: string;
  name: string;
  year: number;
  shift: string;
  students: number;
  assignments: Assignment[];
}
interface Option {
  id: string;
  name: string;
}

const SHIFTS = ["MANHA", "TARDE", "NOITE", "INTEGRAL"];

export function TurmasManager({
  classes,
  teachers,
  subjects,
}: {
  classes: Row[];
  teachers: Option[];
  subjects: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Vínculos
  const [linkClass, setLinkClass] = useState<Row | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassInput>({ resolver: zodResolver(classSchema), defaultValues: { shift: "MANHA", year: new Date().getFullYear() } });

  function openNew() {
    setEditing(null);
    setServerError(null);
    reset({ name: "", year: new Date().getFullYear(), shift: "MANHA" });
    setOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setServerError(null);
    reset({ name: row.name, year: row.year, shift: row.shift as ClassInput["shift"] });
    setOpen(true);
  }
  async function onSubmit(values: ClassInput) {
    const res = editing ? await updateClass(editing.id, values) : await createClass(values);
    if (!res.ok) return setServerError(res.error);
    setOpen(false);
    router.refresh();
  }
  async function onDelete(row: Row) {
    if (!confirm(`Excluir a turma "${row.name}"?`)) return;
    const res = await deleteClass(row.id);
    if (!res.ok) alert(res.error);
    else router.refresh();
  }

  async function addLink() {
    if (!linkClass) return;
    setLinkError(null);
    const res = await createAssignment({ classId: linkClass.id, subjectId, teacherId });
    if (!res.ok) return setLinkError(res.error);
    setSubjectId("");
    setTeacherId("");
    setLinkClass(null);
    router.refresh();
  }
  async function removeLink(id: string) {
    const res = await deleteAssignment(id);
    if (!res.ok) alert(res.error);
    else {
      setLinkClass(null);
      router.refresh();
    }
  }

  const columns: Column<Row>[] = [
    { key: "name", header: "Turma", render: (c) => <span className="font-medium text-slate-800 dark:text-white">{c.name}</span> },
    { key: "year", header: "Ano" },
    { key: "shift", header: "Turno", render: (c) => <Badge tone="brand">{humanizeEnum(c.shift)}</Badge> },
    { key: "students", header: "Alunos" },
    { key: "assignments", header: "Vínculos", render: (c) => `${c.assignments.length}` },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setLinkClass(c)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-600" aria-label="Vínculos"><Link2 className="h-4 w-4" /></button>
          <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-500/10 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(c)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={classes}
        columns={columns}
        getSearchText={(c) => `${c.name} ${c.year} ${c.shift}`}
        toolbar={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nova turma</Button>}
      />

      {/* Modal turma */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar turma" : "Nova turma"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput label="Nome da turma" placeholder="Ex: 9º Ano A" error={errors.name?.message} {...register("name")} />
          <FormInput label="Ano letivo" type="number" error={errors.year?.message} {...register("year")} />
          <SelectInput label="Turno" options={SHIFTS.map((s) => ({ value: s, label: humanizeEnum(s) }))} error={errors.shift?.message} {...register("shift")} />
          {serverError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{serverError}</p>}
        </form>
      </Modal>

      {/* Modal vínculos */}
      <Modal
        open={!!linkClass}
        onClose={() => setLinkClass(null)}
        title={`Vínculos — ${linkClass?.name ?? ""}`}
        description="Associe professores e disciplinas a esta turma."
        size="lg"
      >
        {linkClass && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectInput
                label="Disciplina"
                placeholder="Selecione"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              />
              <SelectInput
                label="Professor"
                placeholder="Selecione"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                options={teachers.map((t) => ({ value: t.id, label: t.name }))}
              />
              <div className="flex items-end">
                <Button className="w-full" onClick={addLink} disabled={!subjectId || !teacherId}>
                  <Plus className="h-4 w-4" /> Vincular
                </Button>
              </div>
            </div>
            {linkError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{linkError}</p>}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Vínculos atuais</p>
              {linkClass.assignments.length === 0 && <p className="text-sm text-slate-400">Nenhum vínculo ainda.</p>}
              {linkClass.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    <strong>{a.subject}</strong> · {a.teacher}
                  </span>
                  <button onClick={() => removeLink(a.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
