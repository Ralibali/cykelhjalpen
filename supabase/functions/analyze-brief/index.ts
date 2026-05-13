import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Webbutveckling", "E-handel", "Digital marknadsföring",
  "Grafisk design/UX", "SEO", "App-utveckling",
  "IT-konsult", "Sociala medier",
  "Mjukvaruutveckling", "Video & foto", "Varumärke & PR",
  "UX/Webbdesign", "Underhåll/IT Support", "Affärsutveckling", "AI-utveckling",
];

const BUDGETS = ["under_10k", "10k_50k", "50k_150k", "over_150k", "unknown"];
const STARTS = ["asap", "within_month", "within_3months", "flexible"];

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Beskrivning saknas." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Du är en svensk projektanalytiker som hjälper beställare att specificera digitala uppdrag på en marknadsplats.
Givet en fritext, returnera ett strukturerat förslag via verktyget extract_brief.
Skriv allt på svenska. Var kortfattad och konkret.`,
            },
            {
              role: "user",
              content: `Analysera följande projektidé och returnera struktur via extract_brief:\n\n${text}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_brief",
                description: "Extrahera ett strukturerat projektbrief från fritext.",
                parameters: {
                  type: "object",
                  properties: {
                    category: { type: "string", enum: CATEGORIES },
                    title: { type: "string", maxLength: 100 },
                    description: { type: "string", maxLength: 600 },
                    budget_range: { type: "string", enum: BUDGETS },
                    start_time: { type: "string", enum: STARTS },
                    requirements: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 6,
                    },
                    questions_for_agencies: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 5,
                    },
                    lead_score: { type: "integer", minimum: 0, maximum: 100 },
                    estimated_matching_agencies: { type: "integer", minimum: 0, maximum: 100 },
                  },
                  required: ["category", "title", "description", "budget_range", "start_time", "requirements", "questions_for_agencies", "lead_score", "estimated_matching_agencies"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_brief" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "För många förfrågningar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-fel" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Inget förslag kunde genereras." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Could not parse tool args", e);
      return new Response(JSON.stringify({ error: "Kunde inte tolka AI-svar." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ brief: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
