import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DESC_SNIPPET_MAX = 280;

function getServiceRoleKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      return keys.default ?? keys.service_role ?? Object.values(keys)[0];
    } catch {
      /* ignore */
    }
  }
  throw new Error("Missing Supabase service key");
}

async function resolveGeminiKey(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const fromEnv = Deno.env.get("GEMINI_API_KEY");
  if (fromEnv?.trim()) return fromEnv.trim();
  const { data, error } = await supabase
    .from("config")
    .select("value")
    .eq("key", "gemini_api_key")
    .maybeSingle();
  if (error) {
    console.error("config gemini_api_key:", error.message);
    return null;
  }
  return data?.value?.trim() ?? null;
}

function snippet(text: string, max = DESC_SNIPPET_MAX): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function normalize(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): string[] {
  return normalize(text).split(" ").filter((w) => w.length >= 3);
}

function textSimilarity(
  probe: string,
  title: string,
  description: string
): number {
  const full = `${title} ${description ?? ""}`;
  const ta = new Set(normalize(probe).split(" ").filter(Boolean));
  const tb = new Set(normalize(full).split(" ").filter(Boolean));
  let tokenScore = 0;
  if (ta.size && tb.size) {
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    tokenScore = inter / Math.max(ta.size, tb.size);
  }
  const wa = significantTokens(probe);
  const wb = significantTokens(full);
  let keywordScore = 0;
  if (wa.length && wb.length) {
    const setB = new Set(wb);
    let shared = 0;
    for (const w of wa) if (setB.has(w)) shared++;
    keywordScore = shared / Math.min(wa.length, wb.length);
  }
  return Math.max(tokenScore, keywordScore);
}

function localBestMatch(
  title: string,
  description: string,
  rows: { id: string; title: string; description: string; status: string }[]
): string | null {
  const probe = `${title} ${description}`;
  const pool = rows.filter((r) => r.status === "approved");
  const candidates = pool.length ? pool : rows;
  let best = { id: null as string | null, score: 0 };
  for (const row of candidates) {
    const score = textSimilarity(probe, row.title, row.description);
    if (score > best.score) best = { id: row.id, score };
  }
  return best.score >= 0.5 ? best.id : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    if (!title || !description) {
      return new Response(
        JSON.stringify({ similar_id: null, error: "title and description required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, getServiceRoleKey());
    const geminiKey = await resolveGeminiKey(supabase);

    const { data: existing, error: dbError } = await supabase
      .from("suggestions")
      .select("id, title, description, status")
      .in("status", ["approved", "pending"])
      .order("created_at", { ascending: false })
      .limit(150);

    if (dbError) throw dbError;

    const list = (existing ?? [])
      .map(
        (s) =>
          `- id: ${s.id} | título: ${s.title} | descrição: ${snippet(s.description)}`
      )
      .join("\n");

    if (!existing?.length) {
      return new Response(JSON.stringify({ similar_id: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!geminiKey) {
      const localOnly = localBestMatch(title, description, existing);
      return new Response(JSON.stringify({ similar_id: localOnly }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você compara sugestões de jogadores de um MMORPG.

NOVA sugestão:
Título: ${title}
Descrição: ${description}

SUGESTÕES JÁ EXISTENTES (aprovadas ou pendentes):
${list}

Se a NOVA sugestão for essencialmente a mesma ideia que alguma existente (mesmo pedido, mesmo bug, mesmo atalho/feature — mesmo com palavras diferentes), responda APENAS o UUID da existente mais parecida.

Se não houver duplicata clara, responda exatamente: null

Uma única linha, sem explicação, sem markdown.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 80 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      const fallbackId = localBestMatch(title, description, existing);
      return new Response(JSON.stringify({ similar_id: fallbackId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const raw =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "null";
    const cleaned = raw.toLowerCase().replace(/['"]/g, "");

    let similar_id: string | null = null;
    if (cleaned !== "null") {
      const uuidMatch = cleaned.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
      if (uuidMatch) similar_id = uuidMatch[0];
    }

    if (!similar_id && existing?.length) {
      similar_id = localBestMatch(title, description, existing);
    }

    if (similar_id) {
      const matched = existing.find((r) => r.id === similar_id);
      if (matched?.status === "pending") {
        const approvedId = localBestMatch(title, description, existing);
        if (approvedId) similar_id = approvedId;
      }
    }

    return new Response(JSON.stringify({ similar_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ similar_id: null, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
