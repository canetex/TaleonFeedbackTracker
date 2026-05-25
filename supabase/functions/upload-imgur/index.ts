import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("IMGUR_CLIENT_ID");
    if (!clientId?.trim()) {
      return new Response(
        JSON.stringify({ error: "IMGUR_CLIENT_ID não configurado no Supabase" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image_base64, mime_type } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "image_base64 obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mime = (mime_type || "image/png").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return new Response(
        JSON.stringify({ error: "Tipo de imagem não permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = image_base64.replace(/^data:[^;]+;base64,/, "");
    const approxBytes = Math.ceil((raw.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "Imagem maior que 10 MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imgurRes = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${clientId.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: raw, type: "base64" }),
    });

    const imgurData = await imgurRes.json();
    if (!imgurRes.ok || !imgurData?.data?.link) {
      console.error("Imgur error:", imgurData);
      return new Response(
        JSON.stringify({
          error: "Falha no upload, tente outra imagem",
          detail: imgurData?.data?.error ?? imgurRes.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        url: imgurData.data.link as string,
        deletehash: imgurData.data.deletehash ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
