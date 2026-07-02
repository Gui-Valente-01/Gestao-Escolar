export const DEFAULT_PAGE_SIZE = 10;

export function parseTableParams(searchParams?: Record<string, string | string[] | undefined>) {
  const rawPage = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const rawQuery = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const page = Math.max(1, Number(rawPage) || 1);
  const query = (rawQuery ?? "").trim();
  const pageSize = DEFAULT_PAGE_SIZE;
  return {
    page,
    query,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}
