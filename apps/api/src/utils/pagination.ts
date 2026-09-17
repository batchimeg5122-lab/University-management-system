/** ?page=1&page_size=50 → Supabase .range(from, to) */
export function pageRange(query: { page?: unknown; page_size?: unknown }, defaultSize = 1000, maxSize = 2000) {
  const page = Math.max(1, Number(query.page) || 1);
  const size = Math.min(maxSize, Math.max(1, Number(query.page_size) || defaultSize));
  const from = (page - 1) * size;
  return { page, size, from, to: from + size - 1 };
}

/** PostgREST `or` шүүлтүүрт аюулгүй ilike утга */
export const ilike = (q: string) => `%${q.replace(/[,()%*]/g, ' ').trim()}%`;
