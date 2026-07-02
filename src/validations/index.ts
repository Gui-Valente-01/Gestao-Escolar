import { z } from "zod";

// Enums espelhando o schema Prisma (evita acoplar o client ao bundle do form)
export const RoleEnum = z.enum([
  "ADMIN",
  "DIRETOR",
  "PEDAGOGA",
  "PROFESSOR",
  "ALUNO",
  "RESPONSAVEL",
]);
export const ShiftEnum = z.enum(["MANHA", "TARDE", "NOITE", "INTEGRAL"]);
export const TermEnum = z.enum(["PRIMEIRO", "SEGUNDO", "TERCEIRO", "QUARTO"]);
export const ActivityTypeEnum = z.enum([
  "TAREFA",
  "PROVA",
  "TRABALHO",
  "RECUPERACAO",
  "PLANO_AULA",
]);
export const OccurrenceTypeEnum = z.enum([
  "COMPORTAMENTO",
  "ATRASO",
  "FALTA_GRAVE",
  "ELOGIO",
  "SAUDE",
  "OUTRO",
]);
export const SeverityEnum = z.enum(["BAIXA", "MEDIA", "ALTA"]);
export const AudienceEnum = z.enum([
  "TODOS",
  "TURMA",
  "PROFESSORES",
  "RESPONSAVEIS",
  "ALUNOS",
]);
export const FollowUpStatusEnum = z.enum(["ABERTO", "EM_ANDAMENTO", "CONCLUIDO"]);
export const EventTypeEnum = z.enum([
  "PROVA",
  "REUNIAO",
  "FERIADO",
  "ENTREGA",
  "EVENTO",
  "RECESSO",
]);
export const ReportScopeEnum = z.enum(["ESCOLA", "TURMA", "ALUNO"]);

// ----------------------------------------------------------------------------
// Autenticação
// ----------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const registerAdminSchema = z
  .object({
    name: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const profilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    password: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
  });

// ----------------------------------------------------------------------------
// Usuários / pessoas
// ----------------------------------------------------------------------------

export const userSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  role: RoleEnum,
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .optional()
    .or(z.literal("")),
  active: z.boolean().default(true),
});

export const studentSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").optional().or(z.literal("")),
  registration: z.string().min(2, "Matrícula obrigatória"),
  birthDate: z.string().optional().or(z.literal("")),
  classId: z.string().optional().or(z.literal("")),
  guardianId: z.string().optional().or(z.literal("")),
});

export const teacherSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").optional().or(z.literal("")),
  registration: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export const guardianSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
});

// ----------------------------------------------------------------------------
// Estrutura acadêmica
// ----------------------------------------------------------------------------

export const classSchema = z.object({
  name: z.string().min(2, "Nome da turma obrigatório"),
  year: z.coerce.number().int().min(2000).max(2100),
  shift: ShiftEnum,
});

export const subjectSchema = z.object({
  name: z.string().min(2, "Nome da disciplina obrigatório"),
  code: z.string().optional().or(z.literal("")),
  workload: z.coerce.number().int().min(0).optional(),
});

export const assignmentSchema = z.object({
  teacherId: z.string().min(1, "Selecione o professor"),
  subjectId: z.string().min(1, "Selecione a disciplina"),
  classId: z.string().min(1, "Selecione a turma"),
});

// ----------------------------------------------------------------------------
// Notas e frequência
// ----------------------------------------------------------------------------

export const gradeSchema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  subjectId: z.string().min(1, "Selecione a disciplina"),
  term: TermEnum,
  year: z.coerce.number().int().min(2000).max(2100),
  value: z.coerce.number().min(0, "Mínimo 0").max(10, "Máximo 10"),
  assessment: z.string().optional().or(z.literal("")),
});

export const attendanceItemSchema = z.object({
  studentId: z.string().min(1),
  present: z.boolean(),
  justified: z.boolean().optional().default(false),
});

export const attendanceBatchSchema = z.object({
  classId: z.string().min(1, "Selecione a turma"),
  subjectId: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Informe a data"),
  items: z.array(attendanceItemSchema).min(1, "Nenhum aluno na lista"),
});

// ----------------------------------------------------------------------------
// Atividades, comunicados, ocorrências, acompanhamento
// ----------------------------------------------------------------------------

export const activitySchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional().or(z.literal("")),
  type: ActivityTypeEnum,
  dueDate: z.string().optional().or(z.literal("")),
  classId: z.string().min(1, "Selecione a turma"),
  subjectId: z.string().optional().or(z.literal("")),
});

export const announcementSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  content: z.string().min(2, "Conteúdo obrigatório"),
  audience: AudienceEnum,
  classId: z.string().optional().or(z.literal("")),
});

export const eventSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional().or(z.literal("")),
  type: EventTypeEnum,
  startsAt: z.string().min(1, "Informe a data de início"),
  endsAt: z.string().optional().or(z.literal("")),
  allDay: z.boolean().default(true),
  audience: AudienceEnum,
  classId: z.string().optional().or(z.literal("")),
});

export const occurrenceSchema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  type: OccurrenceTypeEnum,
  severity: SeverityEnum,
  description: z.string().min(3, "Descreva a ocorrência"),
});

export const followUpSchema = z.object({
  studentId: z.string().min(1, "Selecione o aluno"),
  title: z.string().min(2, "Título obrigatório"),
  notes: z.string().min(3, "Descreva o acompanhamento"),
  plan: z.string().optional().or(z.literal("")),
  status: FollowUpStatusEnum.default("ABERTO"),
});

// ----------------------------------------------------------------------------
// IA
// ----------------------------------------------------------------------------

export const aiAskSchema = z.object({
  message: z.string().min(2, "Escreva uma pergunta"),
  studentId: z.string().optional().or(z.literal("")),
});

export const schoolReportSchema = z
  .object({
    title: z.string().optional().or(z.literal("")),
    scope: ReportScopeEnum,
    period: z.string().optional().or(z.literal("")),
    classId: z.string().optional().or(z.literal("")),
    studentId: z.string().optional().or(z.literal("")),
  })
  .refine((d) => d.scope !== "TURMA" || Boolean(d.classId), {
    message: "Selecione a turma",
    path: ["classId"],
  })
  .refine((d) => d.scope !== "ALUNO" || Boolean(d.studentId), {
    message: "Selecione o aluno",
    path: ["studentId"],
  });

export const exportClassDataSchema = z.object({
  classId: z.string().min(1, "Selecione a turma"),
  subjectId: z.string().optional().or(z.literal("")),
  year: z.coerce.number().int().min(2000).max(2100),
  format: z.enum(["csv", "pdf"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type OccurrenceInput = z.infer<typeof occurrenceSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type SchoolReportInput = z.infer<typeof schoolReportSchema>;
