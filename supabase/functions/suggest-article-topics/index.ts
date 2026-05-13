import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du är en senior SEO-strateg som planerar innehåll för Updro – Sveriges marknadsplats där företag jämför offerter från digitala byråer. Dina topics ska driva organisk trafik från Google och konvertera till publicerade uppdrag (/publicera).

OM UPDRO:
- Drivs av Aurora Media AB, grundat 2026
- Konkurrerar med Offerta.se, Servicefinder, Hittabyrå.se
- Målgrupp: svenska företagare som behöver digital hjälp men inte vet hur man väljer byrå eller vad det ska kosta
- Affärsmodell: gratis för uppdragsgivare, byråer betalar per uppdrag
- Tjänstekategorier: webbutveckling, seo, ehandel, apputveckling, digital-marknadsforing, grafisk-design, google-ads, e-postmarknadsforing, analys-data, ux-ui-design
- Städer: 25 städer (Stockholm, Göteborg, Malmö, Uppsala, Linköping, Västerås, Örebro, Norrköping, Helsingborg, Jönköping, Umeå, Lund, Gävle, Sundsvall, Eskilstuna, Halmstad, Karlstad, Växjö, Södertälje, Luleå, Borås, Kristianstad, Solna, Skellefteå, Kalmar)

TOPIC-STRATEGI – täck dessa sökintents:

1. TRANSACTIONAL (hög intent, konverterar bäst):
   - "Bästa [tjänst]-byrån [stad] 2026"
   - "[Tjänst] pris [stad] 2026"
   - "Billig [tjänst] [region]"
   - "Hyra [tjänst]-konsult" / "Anlita [tjänst]-expert"

2. COMMERCIAL INVESTIGATION (folk som utvärderar):
   - "Freelance vs byrå" / "Liten vs stor byrå"
   - "[Plattform] vs [plattform]" (Shopify vs WooCommerce, Webflow vs WordPress, HubSpot vs Mailchimp)
   - "Hur väljer man [tjänst]-byrå"
   - "Vad ska jag fråga [tjänst]-byrån"
   - Jämförelser mot konkurrenter (objektivt, inte reklam)

3. INFORMATIONAL (top-of-funnel, bygger auktoritet):
   - "Vad kostar [tjänst] 2026"
   - "Hur lång tid tar [tjänst]"
   - "Vad är [tekniskt begrepp]" (för nybörjare)
   - "Checklista: [tjänst]"
   - "[Tjänst] för småföretag/e-handel/startups"

4. LOKAL SEO (drar lokal trafik):
   - Tjänst + stad: "Webbyrå Linköping", "SEO-byrå Göteborg"
   - Tjänst + region: "Webbutveckling Östergötland"
   - Nisch per bransch × stad: "E-handelsbyrå för kläder Malmö"

5. AI-SÖK OPTIMERING (för ChatGPT/Perplexity/Claude):
   - Direkta frågor: "Hur hittar jag en bra webbyrå i Sverige?", "Vad ska en ny hemsida till småföretag kosta?"
   - Listartiklar: "10 svenska webbyråer att känna till"
   - "Så fungerar [tjänst] – förklarat för företagare"

6. NEWS / TREND (fräschörshet-signal):
   - Årsrapporter: "Digitala byråer i Sverige – rapport 2026"
   - Plattformsuppdateringar
   - Google-updates och AI-trender

7. CASE-STUDY (bygger trust, ALLTID anonymiserat):
   - "Ett [bransch]-företag i [region]" – aldrig påhittade namn

REGLER FÖR TOPIC-VARIATION:
- Balansera: högst 40% transactional, 30% commercial, 20% informational, 10% news/case
- Sprid över ALLA kategorier – inte allt om webbutveckling
- Sprid över städer – inkludera Linköping (hemortsfördel), Norrköping, Jönköping (medelstora med lägre konkurrens)
- Blanda svårighetsgrad: lätta lång-svans + svåra huvud-keywords
- UNDVIK duplicerade topics – titta noggrant på excludeSlugs

REGLER FÖR KEYWORD-SPRÅK:
- Svenska sökord ("webbyrå" inte "web agency", "e-handelsplattform" inte "ecommerce platform")
- Inkludera år (2026) i pris- och trend-keywords
- Tänk på hur svenska företagare googlar: "vad kostar en hemsida" inte "hemsida kostnad analys"

UNDVIK topics som:
- För breda ("vad är internet")
- För generiska ("tips för företag")
- Saknar commercial intent
- Är kontroversiella/politiska
- Skickar folk bort från byråer ("gör din egen hemsida gratis")

FÖR VARJE TOPIC, inkludera:
- topic: skarp arbetsrubrik (INTE final h1)
- targetKeyword: primär keyword i lowercase, 2-5 ord
- category: en av de 10 tjänstekategorierna
- city: om lokal-seo (annars utelämna fältet)
- articleType: guide | news | comparison | case-study
- searchIntent: informational | commercial | transactional | navigational
- estimatedDifficulty: låg | medel | hög
- whyThisTopic: 1-2 meningar om varför artikeln hjälper Updro – nämn vilken läsare och vad de gör efter
- suggestedLength: tecken (5000 guider, 3500 news, 6000 pelarsidor, 4500 jämförelser)

Returnera ENDAST giltig JSON enligt schemat: { "topics": [...] }. Ingen markdown-wrap, inga förklaringar. Exakt det antal topics som efterfrågas.`;

interface SuggestRequest {
  count?: number;
  focus?: string;
  excludeSlugs?: string[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as SuggestRequest;
    const count = Math.min(20, Math.max(1, Number(body.count) || 10));
    const focus = (body.focus || "").trim();
    const excludeSlugs = Array.isArray(body.excludeSlugs)
      ? body.excludeSlugs.slice(0, 500).join(", ")
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Föreslå ${count} nya artikeltopics för Updro.

${focus ? `Fokusområde denna gång: ${focus}. Väg topics tydligt mot detta utan att bli enformig.` : "Inget specifikt fokus – blanda enligt strategin för bred SEO-täckning."}

Undvik ämnen som redan är täckta. Befintliga artikel-slugs:
${excludeSlugs || "(inga ännu)"}

Returnera JSON: { "topics": [...] } med exakt ${count} objekt.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_topics",
              description: "Return planned article topics following Updro SEO strategy.",
              parameters: {
                type: "object",
                properties: {
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        targetKeyword: { type: "string" },
                        category: { type: "string" },
                        city: { type: "string" },
                        articleType: {
                          type: "string",
                          enum: ["guide", "news", "comparison", "case-study"],
                        },
                        searchIntent: {
                          type: "string",
                          enum: ["informational", "commercial", "transactional", "navigational"],
                        },
                        estimatedDifficulty: {
                          type: "string",
                          enum: ["låg", "medel", "hög"],
                        },
                        whyThisTopic: { type: "string" },
                        suggestedLength: { type: "number" },
                      },
                      required: [
                        "topic",
                        "targetKeyword",
                        "category",
                        "articleType",
                        "searchIntent",
                        "estimatedDifficulty",
                        "whyThisTopic",
                        "suggestedLength",
                      ],
                    },
                  },
                },
                required: ["topics"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_topics" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit – försök igen om en stund." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut – fyll på i Lovable-workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 1000));
      return new Response(JSON.stringify({ error: "AI returned no structured topics" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("JSON parse failed", argsStr.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topics = Array.isArray(parsed?.topics) ? parsed.topics : [];
    return new Response(JSON.stringify({ topics }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-article-topics error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
