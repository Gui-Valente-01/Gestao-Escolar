"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (item: T) => string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  initialSearch?: string;
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageParam?: string;
    searchParam?: string;
  };
}

export function DataTable<T>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Buscar...",
  getSearchText,
  emptyMessage = "Nenhum registro encontrado.",
  toolbar,
  pageSize = 10,
  initialSearch = "",
  serverPagination,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialSearch);
  const [page, setPage] = useState(0);
  const isServerPaginated = Boolean(serverPagination);

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  function updateServerParams(nextPage: number, nextQuery = query) {
    if (!serverPagination) return;
    const params = new URLSearchParams(searchParams.toString());
    const pageParam = serverPagination.pageParam ?? "page";
    const searchParam = serverPagination.searchParam ?? "q";

    if (nextQuery.trim()) params.set(searchParam, nextQuery.trim());
    else params.delete(searchParam);

    if (nextPage > 1) params.set(pageParam, String(nextPage));
    else params.delete(pageParam);

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const filtered = useMemo(() => {
    if (isServerPaginated) return data;
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((item) => {
      const text = getSearchText ? getSearchText(item) : JSON.stringify(item);
      return text.toLowerCase().includes(q);
    });
  }, [data, query, getSearchText, isServerPaginated]);

  const activePageSize = serverPagination?.pageSize ?? pageSize;
  const totalItems = serverPagination?.total ?? filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / activePageSize));
  const requestedServerPage = Math.max(0, (serverPagination?.page ?? 1) - 1);
  const current = isServerPaginated ? Math.min(requestedServerPage, totalPages - 1) : Math.min(page, totalPages - 1);
  const rows = isServerPaginated ? filtered : filtered.slice(current * activePageSize, current * activePageSize + activePageSize);

  return (
    <div className="card overflow-hidden">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <form
              className="relative w-full sm:max-w-xs"
              onSubmit={(e) => {
                e.preventDefault();
                if (isServerPaginated) updateServerParams(1);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!isServerPaginated) setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="input-base pl-9"
                aria-label={searchPlaceholder}
              />
              <button type="submit" className="sr-only">Buscar</button>
            </form>
          ) : (
            <div />
          )}
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3 font-semibold", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-slate-700 dark:text-slate-200", col.className)}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-white/10">
          <span className="text-slate-400">
            {totalItems} registro(s) · página {current + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isServerPaginated) updateServerParams(current);
                else setPage((p) => Math.max(0, p - 1));
              }}
              disabled={current === 0}
              className="rounded-lg px-3 py-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Anterior
            </button>
            <button
              onClick={() => {
                if (isServerPaginated) updateServerParams(current + 2);
                else setPage((p) => Math.min(totalPages - 1, p + 1));
              }}
              disabled={current >= totalPages - 1}
              className="rounded-lg px-3 py-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
