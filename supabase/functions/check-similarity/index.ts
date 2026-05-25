import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: dbError } = await supabase
      .from("suggestions")
      .select("id, title")
      .in("status", ["approved", "pending"])
      .limit(200);

    if (dbError) throw dbError;

    const list = (existing ?? [])
      .map((s) => `- id: ${s.id} | título: ${s.title}`)
      .join("\n");

    if (!list.length || !geminiKey) {
      return new Response(JSON.stringify({ similar_id: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Compare a seguinte sugestão:
Título: ${title}
Descrição: ${description}

Com esta lista de sugestões existentes:
${list}

Se houver similaridade superior a 70% com alguma existente, responda APENAS com o UUID da sugestão similar (formato uuid). Caso contrário, responda exatamente: null
Sem explicação, uma única linha.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return new Response(JSON.stringify({ similar_id: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const raw =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "null";
    const cleaned = raw.toLowerCase().replace(/['"]/g, "");

    let similar_id: string | null = null;
    if (cleaned !== "null" && cleaned.length >= 36) {
      const uuidMatch = cleaned.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
      if (uuidMatch) similar_id = uuidMatch[0];
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
