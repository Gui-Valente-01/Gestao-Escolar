"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Lock, Mail, ShieldCheck, Sparkles, Users } from "lucide-react";
import { loginSchema, type LoginInput } from "@/validations";
import { FormInput } from "@/components/forms/FormInput";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  // Mantém o botão travado durante o redirecionamento (evita cliques repetidos)
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const busy = isSubmitting || redirecting;

  async function onSubmit(values: LoginInput) {
    if (busy) return;
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setServerError(data.error || "Não foi possível entrar.");
        return;
      }
      // Sucesso: trava o botão e navega (o componente desmonta ao redirecionar)
      setRedirecting(true);
      router.push(params.get("from") || data.redirect || "/dashboard");
      router.refresh();
    } catch {
      setServerError("Falha de conexão. Verifique sua internet e tente novamente.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel ilustrativo */}
      <div className="auth-aurora relative hidden flex-col justify-between overflow-hidden bg-surface-darker p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">EduGestão <span className="text-brand-300">IA</span></span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gestão escolar <span className="gradient-text">inteligente</span> com agentes de IA.
          </h1>
          <p className="max-w-md text-slate-300">
            Dashboards, notas, frequência, comunicados e assistentes de inteligência artificial
            para cada perfil da escola — em uma plataforma só.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, t: "6 perfis de acesso", d: "Permissões por papel" },
              { icon: Sparkles, t: "5 agentes de IA", d: "Análises com dados reais" },
              { icon: Users, t: "CRUD completo", d: "Alunos, turmas, professores" },
              { icon: Lock, t: "Seguro & LGPD", d: "Senhas e sessões protegidas" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <f.icon className="mb-2 h-5 w-5 text-brand-300" />
                <p className="text-sm font-semibold">{f.t}</p>
                <p className="text-xs text-slate-400">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} EduGestão IA · Plataforma educacional</p>
      </div>

      {/* Formulário */}
      <div className="relative flex items-center justify-center bg-surface-light p-6 dark:bg-surface-darker">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">EduGestão IA</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Entrar</h2>
            <p className="mt-1 text-sm text-slate-500">Acesse sua área com e-mail e senha.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <FormInput
                label="E-mail"
                type="email"
                placeholder="voce@escola.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />
              <FormInput
                label="Senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
              />

              {serverError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Primeiro acesso da escola?{" "}
              <Link href="/register" className="font-semibold text-brand-600 hover:underline">
                Criar administrador
              </Link>
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white/60 p-4 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5">
            <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">Contas de demonstração (senha: edugestao123)</p>
            <p>admin@edugestao.com · diretor@edugestao.com · pedagoga@edugestao.com</p>
            <p>carlos.prof@edugestao.com · ana.aluno@edugestao.com · marta.resp@edugestao.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-light dark:bg-surface-darker" />}>
      <LoginContent />
    </Suspense>
  );
}
