import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/permissions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const FEATURES = [
  { icon: ShieldCheck, title: "Acesso por perfil", desc: "Administrador, diretor, pedagoga, professor, aluno e responsável — cada um com sua área e permissões." },
  { icon: Sparkles, title: "Agentes de IA", desc: "Cinco assistentes especializados que analisam dados reais da escola para apoiar decisões." },
  { icon: BarChart3, title: "Dashboards com gráficos", desc: "Indicadores de desempenho, frequência e alunos em risco em tempo real." },
  { icon: Users, title: "CRUD completo", desc: "Gerencie usuários, alunos, turmas, disciplinas, professores e responsáveis." },
  { icon: HeartHandshake, title: "Acompanhamento pedagógico", desc: "Planos de apoio, ocorrências e observações centralizadas por aluno." },
  { icon: GraduationCap, title: "Notas e frequência", desc: "Lançamento de notas por bimestre e registro de presença por turma." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? ROLE_HOME[user.role] : "/login";

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-darker">
      {/* Topo */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold text-slate-800 dark:text-white">
            EduGestão <span className="gradient-text">IA</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            {user ? "Ir para o painel" : "Entrar"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="auth-aurora">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" /> Plataforma de gestão escolar com IA
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-800 dark:text-white sm:text-6xl">
            A escola inteligente <br />
            <span className="gradient-text">começa aqui.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-300">
            Centralize alunos, notas, frequência, comunicação e inteligência artificial em uma
            plataforma moderna, segura e pensada para cada perfil da comunidade escolar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-glow transition hover:bg-brand-700"
            >
              Acessar plataforma <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-white dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Configurar minha escola
            </Link>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-glow">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-white/10">
        © {new Date().getFullYear()} EduGestão IA — Plataforma educacional. Feito com Next.js, Prisma e IA.
      </footer>
    </div>
  );
}
