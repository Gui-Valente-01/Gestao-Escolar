import { PrismaClient, type Term } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Senha padrão de todas as contas de demonstração.
const PASSWORD = "edugestao123";
const YEAR = 2026;

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Limpando base de dados...");
  await prisma.aiInteraction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.schoolReport.deleteMany();
  await prisma.pedagogicalFollowUp.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.teachingAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --------------------------------------------------------------------------
  // Gestão (admin, diretor, pedagoga)
  // --------------------------------------------------------------------------
  console.log("👤 Criando equipe de gestão...");
  await prisma.user.create({
    data: { name: "Administrador do Sistema", email: "admin@edugestao.com", passwordHash, role: "ADMIN" },
  });
  await prisma.user.create({
    data: { name: "Dra. Helena Martins", email: "diretor@edugestao.com", passwordHash, role: "DIRETOR" },
  });
  const pedagogaUser = await prisma.user.create({
    data: { name: "Patrícia Souza", email: "pedagoga@edugestao.com", passwordHash, role: "PEDAGOGA" },
  });

  // --------------------------------------------------------------------------
  // Disciplinas
  // --------------------------------------------------------------------------
  console.log("📚 Criando disciplinas...");
  const subjectsData = [
    { name: "Matemática", code: "MAT", workload: 200 },
    { name: "Português", code: "POR", workload: 200 },
    { name: "Ciências", code: "CIE", workload: 120 },
    { name: "História", code: "HIS", workload: 80 },
    { name: "Geografia", code: "GEO", workload: 80 },
    { name: "Inglês", code: "ING", workload: 80 },
  ];
  const subjects = [];
  for (const s of subjectsData) {
    subjects.push(await prisma.subject.create({ data: s }));
  }
  const subjectByName = Object.fromEntries(subjects.map((s) => [s.name, s]));

  // --------------------------------------------------------------------------
  // Turmas
  // --------------------------------------------------------------------------
  console.log("🏫 Criando turmas...");
  const classesData = [
    { name: "6º Ano A", year: YEAR, shift: "MANHA" as const },
    { name: "7º Ano A", year: YEAR, shift: "MANHA" as const },
    { name: "8º Ano B", year: YEAR, shift: "TARDE" as const },
    { name: "9º Ano A", year: YEAR, shift: "MANHA" as const },
  ];
  const classes = [];
  for (const c of classesData) {
    classes.push(await prisma.class.create({ data: c }));
  }

  // --------------------------------------------------------------------------
  // Professores + vínculos (professor x disciplina x turma)
  // --------------------------------------------------------------------------
  console.log("👩‍🏫 Criando professores e vínculos...");
  const teacherDefs = [
    { name: "Carlos Eduardo Lima", email: "carlos.prof@edugestao.com", subjects: ["Matemática", "Ciências"] },
    { name: "Fernanda Alves", email: "fernanda.prof@edugestao.com", subjects: ["Português", "Inglês"] },
    { name: "Roberto Nunes", email: "roberto.prof@edugestao.com", subjects: ["História", "Geografia"] },
  ];

  const teachers: { id: string; teacher: { id: string } | null; subjectNames: string[] }[] = [];
  for (let i = 0; i < teacherDefs.length; i++) {
    const t = teacherDefs[i];
    const user = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash,
        role: "PROFESSOR",
        teacher: { create: { registration: `PROF${1000 + i}`, hiredAt: daysAgo(400) } },
      },
      include: { teacher: true },
    });
    teachers.push({ id: user.id, teacher: user.teacher, subjectNames: t.subjects });
  }

  // Cada professor leciona suas disciplinas em todas as turmas
  for (const teacher of teachers) {
    for (const subjName of teacher.subjectNames) {
      const subject = subjectByName[subjName];
      for (const cls of classes) {
        await prisma.teachingAssignment.create({
          data: { teacherId: teacher.teacher!.id, subjectId: subject.id, classId: cls.id },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Responsáveis
  // --------------------------------------------------------------------------
  console.log("👪 Criando responsáveis...");
  const guardianDefs = [
    { name: "Marta Pereira", email: "marta.resp@edugestao.com", phone: "(11) 98888-0001" },
    { name: "João Batista", email: "joao.resp@edugestao.com", phone: "(11) 98888-0002" },
    { name: "Sandra Oliveira", email: "sandra.resp@edugestao.com", phone: "(11) 98888-0003" },
  ];
  const guardians = [];
  for (const g of guardianDefs) {
    const user = await prisma.user.create({
      data: {
        name: g.name,
        email: g.email,
        passwordHash,
        role: "RESPONSAVEL",
        guardian: { create: { phone: g.phone } },
      },
      include: { guardian: true },
    });
    guardians.push(user);
  }

  // --------------------------------------------------------------------------
  // Alunos (com perfil de desempenho para gerar dados realistas)
  // --------------------------------------------------------------------------
  console.log("🎓 Criando alunos, matrículas, notas e frequência...");
  type Perf = "alto" | "medio" | "baixo";
  const studentDefs: { name: string; email: string; classIdx: number; guardianIdx: number; perf: Perf }[] = [
    { name: "Ana Clara Pereira", email: "ana.aluno@edugestao.com", classIdx: 0, guardianIdx: 0, perf: "alto" },
    { name: "Bruno Pereira", email: "bruno.aluno@edugestao.com", classIdx: 1, guardianIdx: 0, perf: "medio" },
    { name: "Caio Batista", email: "caio.aluno@edugestao.com", classIdx: 0, guardianIdx: 1, perf: "baixo" },
    { name: "Daniela Batista", email: "daniela.aluno@edugestao.com", classIdx: 2, guardianIdx: 1, perf: "medio" },
    { name: "Eduardo Oliveira", email: "eduardo.aluno@edugestao.com", classIdx: 3, guardianIdx: 2, perf: "alto" },
    { name: "Felipe Oliveira", email: "felipe.aluno@edugestao.com", classIdx: 3, guardianIdx: 2, perf: "baixo" },
    { name: "Gabriela Santos", email: "gabriela.aluno@edugestao.com", classIdx: 1, guardianIdx: 0, perf: "medio" },
    { name: "Hugo Lima", email: "hugo.aluno@edugestao.com", classIdx: 2, guardianIdx: 1, perf: "medio" },
    { name: "Isabela Costa", email: "isabela.aluno@edugestao.com", classIdx: 0, guardianIdx: 2, perf: "alto" },
    { name: "João Vitor Rocha", email: "joaov.aluno@edugestao.com", classIdx: 3, guardianIdx: 1, perf: "baixo" },
  ];

  const perfRange: Record<Perf, [number, number]> = {
    alto: [7.5, 9.8],
    medio: [5, 7.4],
    baixo: [2, 5.2],
  };
  const terms: Term[] = ["PRIMEIRO", "SEGUNDO"];

  let studentIndex = 0;
  for (const def of studentDefs) {
    studentIndex++;
    const cls = classes[def.classIdx];
    const guardian = guardians[def.guardianIdx];

    const user = await prisma.user.create({
      data: {
        name: def.name,
        email: def.email,
        passwordHash,
        role: "ALUNO",
        student: {
          create: {
            registration: `${YEAR}${String(studentIndex).padStart(4, "0")}`,
            birthDate: daysAgo(365 * (11 + def.classIdx) + studentIndex),
            classId: cls.id,
            guardianId: guardian.guardian!.id,
          },
        },
      },
      include: { student: true },
    });
    const student = user.student!;

    // Matrícula do ano letivo
    await prisma.enrollment.create({
      data: { studentId: student.id, classId: cls.id, year: YEAR, status: "ATIVA" },
    });

    // Notas: para cada vínculo de ensino da turma
    const assignments = await prisma.teachingAssignment.findMany({ where: { classId: cls.id } });
    const [min, max] = perfRange[def.perf];
    for (const a of assignments) {
      for (const term of terms) {
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: a.subjectId,
            teacherId: a.teacherId,
            term,
            year: YEAR,
            value: rand(min, max),
            assessment: "Média do bimestre",
          },
        });
      }
    }

    // Frequência: 20 dias letivos; alunos "baixo" têm mais faltas
    const absenceRate = def.perf === "baixo" ? 0.25 : def.perf === "medio" ? 0.1 : 0.03;
    const anyAssignment = assignments[0];
    for (let d = 1; d <= 20; d++) {
      const present = Math.random() > absenceRate;
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          subjectId: anyAssignment?.subjectId ?? null,
          teacherId: anyAssignment?.teacherId ?? null,
          date: daysAgo(d * 3),
          present,
          justified: !present && Math.random() > 0.6,
          note: present ? null : "Falta registrada",
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // Ocorrências, acompanhamentos, comunicados e atividades
  // --------------------------------------------------------------------------
  console.log("📝 Criando ocorrências, acompanhamentos e comunicados...");
  const lowStudents = await prisma.student.findMany({
    where: { user: { name: { in: ["Caio Batista", "Felipe Oliveira", "João Vitor Rocha"] } } },
    include: { user: true },
  });
  const profUser = teachers[0];

  for (const s of lowStudents) {
    await prisma.occurrence.create({
      data: {
        studentId: s.id,
        reportedById: profUser.id,
        type: "COMPORTAMENTO",
        severity: "MEDIA",
        description: `Aluno(a) ${s.user.name} apresentou queda de rendimento e dificuldade de concentração.`,
      },
    });
    await prisma.pedagogicalFollowUp.create({
      data: {
        studentId: s.id,
        authorId: pedagogaUser.id,
        title: "Plano de apoio inicial",
        notes: `Acompanhamento iniciado para ${s.user.name} devido a notas baixas e faltas.`,
        plan: "Reforço em Matemática e Português 2x por semana; reunião com responsável.",
        status: "EM_ANDAMENTO",
      },
    });
  }

  const diretorUser = await prisma.user.findUniqueOrThrow({ where: { email: "diretor@edugestao.com" } });
  await prisma.announcement.create({
    data: {
      title: "Reunião de pais e mestres",
      content: "A reunião acontecerá no próximo sábado às 9h no auditório da escola.",
      audience: "TODOS",
      authorId: diretorUser.id,
    },
  });
  await prisma.announcement.create({
    data: {
      title: "Entrega de trabalho de Ciências",
      content: "Lembrem-se de entregar o trabalho sobre ecossistemas até sexta-feira.",
      audience: "ALUNOS",
      authorId: profUser.id,
      classId: classes[0].id,
    },
  });

  await prisma.activity.create({
    data: {
      title: "Lista de exercícios — Frações",
      description: "Resolver os exercícios 1 a 20 do capítulo 4.",
      type: "TAREFA",
      dueDate: daysAgo(-7),
      classId: classes[0].id,
      subjectId: subjectByName["Matemática"].id,
      teacherId: profUser.teacher!.id,
    },
  });

  console.log("📅 Criando eventos do calendário...");
  await prisma.event.createMany({
    data: [
      { title: "Reunião de pais e mestres", type: "REUNIAO", startsAt: daysAgo(-6), allDay: true, audience: "TODOS", authorId: diretorUser.id },
      { title: "Prova de Matemática — capítulo 4", type: "PROVA", startsAt: daysAgo(-10), allDay: true, audience: "ALUNOS", classId: classes[0].id, authorId: profUser.id },
      { title: "Entrega do trabalho de Ciências", type: "ENTREGA", startsAt: daysAgo(-3), allDay: true, audience: "ALUNOS", classId: classes[0].id, authorId: profUser.id },
      { title: "Conselho de classe", type: "REUNIAO", startsAt: daysAgo(-20), allDay: true, audience: "PROFESSORES", authorId: diretorUser.id },
      { title: "Recesso escolar", type: "RECESSO", startsAt: daysAgo(-45), endsAt: daysAgo(-40), allDay: true, audience: "TODOS", authorId: diretorUser.id },
    ],
  });

  console.log("💬 Criando mensagens de exemplo...");
  await prisma.message.createMany({
    data: [
      { senderId: guardians[0].id, recipientId: profUser.id, body: "Boa tarde, professor! Como está o desempenho da Ana em Matemática?", createdAt: daysAgo(2) },
      { senderId: profUser.id, recipientId: guardians[0].id, body: "Boa tarde! A Ana vai muito bem, está entre as melhores da turma. Parabéns!", createdAt: daysAgo(2), readAt: daysAgo(1) },
      { senderId: pedagogaUser.id, recipientId: guardians[1].id, body: "Olá! Gostaria de agendar uma conversa sobre o acompanhamento do Caio.", createdAt: daysAgo(1) },
    ],
  });

  console.log("💰 Criando mensalidades de exemplo...");
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@edugestao.com" } });
  const someStudents = await prisma.student.findMany({ orderBy: { registration: "asc" } });
  const invoiceData = someStudents.flatMap((st, idx) => [
    { studentId: st.id, description: "Mensalidade — mês anterior", amount: 450, dueDate: daysAgo(20), status: "PAGO" as const, paidAt: daysAgo(18), createdById: adminUser.id },
    { studentId: st.id, description: "Mensalidade — mês atual", amount: 450, dueDate: idx % 3 === 0 ? daysAgo(4) : daysAgo(-12), status: "PENDENTE" as const, createdById: adminUser.id },
  ]);
  await prisma.invoice.createMany({ data: invoiceData });

  console.log("🧩 Criando laudos, anotações de desenvolvimento e atividade adaptada...");
  const caio = await prisma.student.findFirst({ where: { user: { name: "Caio Batista" } } });
  if (caio) {
    await prisma.studentSupportNeed.create({
      data: {
        studentId: caio.id,
        type: "TDAH",
        description: "Laudo de TDAH apresentado pela família.",
        observations: "Tempo estendido em avaliações; sentar próximo ao professor; instruções curtas.",
        active: true,
        createdById: pedagogaUser.id,
      },
    });
    await prisma.studentDevelopmentNote.create({
      data: {
        studentId: caio.id,
        authorId: profUser.id,
        content: "Demonstrou melhora de foco nas últimas semanas com apoio individualizado em Matemática.",
      },
    });
  }

  await prisma.activity.create({
    data: {
      title: "Atividade adaptada — Frações (apoio)",
      description: "Versão com material ampliado e passo a passo detalhado.",
      type: "RECUPERACAO",
      classId: classes[0].id,
      subjectId: subjectByName["Matemática"].id,
      teacherId: profUser.teacher!.id,
      adapted: true,
      adaptationNotes: "Tempo estendido, material ampliado e apoio de mediador.",
      attachments: {
        create: [
          { type: "PDF", title: "Lista adaptada (PDF)", url: "https://example.com/lista-adaptada.pdf" },
          { type: "VIDEO", title: "Vídeo explicativo de frações", url: "https://www.youtube.com/watch?v=exemplo" },
        ],
      },
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log("\n🔑 Credenciais de acesso (senha para todos): " + PASSWORD);
  console.log("   Admin .......... admin@edugestao.com");
  console.log("   Diretor ........ diretor@edugestao.com");
  console.log("   Pedagoga ....... pedagoga@edugestao.com");
  console.log("   Professor ...... carlos.prof@edugestao.com");
  console.log("   Aluno .......... ana.aluno@edugestao.com");
  console.log("   Responsável .... marta.resp@edugestao.com");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
