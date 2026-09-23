/**
 * Supabase (PostgREST) нэг хүсэлтэд 1000 мөрөөс ихийг буцаадаггүй.
 * Тайланд бүх мөр хэрэгтэй үед .range()-ээр хуудаслан татна.
 * @param build — шинэ query буцаах функц (range-ийг энэ функц нэмнэ)
 */
export async function fetchAll<T = any>(build: () => any, pageSize = 1000, max = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return out;
}
