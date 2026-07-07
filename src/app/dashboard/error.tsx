"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Boundary de erro para as páginas do dashboard.
// Evita que uma falha temporária (ex: banco indisponível) quebre a tela toda.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] erro na página:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Não foi possível carregar esta página</h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        Pode ser uma instabilidade temporária na conexão com o banco de dados. Aguarde alguns
        segundos e tente novamente.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  );
}
