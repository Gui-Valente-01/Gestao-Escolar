"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { useToast } from "@/components/providers/ToastProvider";
import { profilePasswordSchema, type ProfilePasswordInput } from "@/validations";
import { changeOwnPassword } from "./actions";

export function PerfilForm() {
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfilePasswordInput>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ProfilePasswordInput) {
    setFeedback(null);
    const res = await changeOwnPassword(values);
    if (!res.ok) {
      setFeedback({ type: "err", msg: res.error });
      showToast({ tone: "error", title: res.error });
      return;
    }
    reset();
    setFeedback({ type: "ok", msg: res.message ?? "Senha atualizada." });
    showToast({ tone: "success", title: res.message ?? "Senha atualizada." });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-brand-500" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Trocar senha</h2>
      </div>

      <div className="space-y-4">
        <FormInput
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <FormInput
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormInput
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      {feedback && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${feedback.type === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
          {feedback.msg}
        </p>
      )}

      <div className="mt-4">
        <Button type="submit" loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </div>
    </form>
  );
}
