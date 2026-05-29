// src/js/supabase-pagination.js — Supabase limita ~1000 linhas por consulta

export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Busca todas as páginas de uma query (runQuery(from, to) => Promise<{ data, error }>).
 * @template T
 * @param {(from: number, to: number) => Promise<{ data: T[] | null, error: unknown }>} runQuery
 * @returns {Promise<T[]>}
 */
export async function fetchAllPages(runQuery) {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await runQuery(from, to);
    if (error) throw error;

    const page = data ?? [];
    if (!page.length) break;

    all.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}
