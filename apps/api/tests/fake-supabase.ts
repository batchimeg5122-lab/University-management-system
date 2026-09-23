/**
 * Supabase query builder-ийн хялбар хуурамч хувилбар.
 * Хүснэгт бүрт өгсөн мөрийг буцаана; .in()/.eq()-ийг энгийн шүүлтүүр болгон хэрэгжүүлнэ.
 */
export function fakeSupabase(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const b: any = {
        select: () => b,
        order: () => b,
        limit: () => b,
        neq: () => b,
        like: () => b,
        gte: () => b,
        lte: () => b,
        eq: (col: string, v: unknown) => {
          if (!col.includes('.') && rows.length && col in rows[0]) rows = rows.filter((r) => r[col] === v);
          return b;
        },
        in: (col: string, vals: unknown[]) => {
          if (!col.includes('.')) rows = rows.filter((r) => !(col in r) || vals.includes(r[col]));
          return b;
        },
        range: (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => res({ data: rows, error: null }),
      };
      return b;
    },
  };
}
