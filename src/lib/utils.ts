import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes do Tailwind resolvendo conflitos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ano letivo corrente. */
export function currentYear() {
  return new Date().getFullYear();
}

/** Formata uma data para o padrão brasileiro (dd/mm/aaaa). */
export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/** Formata data e hora no padrão brasileiro. */
export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Iniciais a partir de um nome completo (para avatares). */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Média aritmética arredondada a 1 casa. Retorna null se vazio. */
export function average(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/** Cor semântica de acordo com a nota (0-10). */
export function gradeColor(value: number | null) {
  if (value === null) return "text-slate-400";
  if (value >= 7) return "text-emerald-500";
  if (value >= 5) return "text-amber-500";
  return "text-red-500";
}

/** Gera uma matrícula sequencial simples a partir de um índice. */
export function buildRegistration(prefix: string, index: number) {
  return `${prefix}${currentYear()}${String(index).padStart(4, "0")}`;
}

/** Capitaliza a primeira letra de cada palavra. */
export function titleCase(text: string) {
  return text.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

/** Converte um enum em rótulo legível (PRIMEIRO -> "Primeiro"). */
export function humanizeEnum(value: string) {
  return titleCase(value.replace(/_/g, " "));
}
