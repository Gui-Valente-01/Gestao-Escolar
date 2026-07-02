"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { registerAdminSchema, type RegisterAdminInput } from "@/validations";
import { FormInput } from "@/components/forms/FormInput";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterAdminInput>({ resolver: zodResolver(registerAdminSchema) });

  async function onSubmit(values: RegisterAdminInput) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setServerError(data.error || "Não foi possível criar o administrador.");
      return;
    }
    router.push(data.redirect || "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-light p-6 dark:bg-surface-darker">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Cadastro inicial</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crie a conta de <strong>Administrador</strong> da escola. Disponível apenas no primeiro acesso.
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput label="Nome completo" placeholder="Seu nome" error={errors.name?.message} {...register("name")} />
            <FormInput label="E-mail" type="email" placeholder="admin@escola.com" error={errors.email?.message} {...register("email")} />
            <FormInput label="Senha" type="password" placeholder="Mínimo 8 caracteres" error={errors.password?.message} {...register("password")} />
            <FormInput
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {serverError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Criar administrador
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <GraduationCap className="h-4 w-4" /> EduGestão IA
        </p>
      </div>
    </div>
  );
}
