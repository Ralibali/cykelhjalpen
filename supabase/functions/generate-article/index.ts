import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du skriver artiklar för Updro – en svensk marknadsplats där företag jämför offerter från digitala byråer. Tonen är en erfaren branschperson som pratar med en företagare på en kaffe, inte en marknadsavdelning som skriver en broschyr.

RÖST OCH TON:
- Skriv som en senior digital konsult med 15 års erfarenhet pratar.
- Trygg, direkt, lite torr humor ibland.
- Använd "du" (inte "Du", inte "ni", inte "man").
- Skriv aktivt: "Byrån tog 80 000 kr" – inte "Kostnaden uppgick till".
- Korta meningar blandat med längre. Variera rytmen.
- Börja inte varje stycke med samma struktur. Variera.
- Skriv som en människa tänker, inte som en essä är disponerad.

FÖRBJUDNA ORD OCH FRASER (använd ALDRIG):
- "Att navigera i" / "navigera den digitala världen"
- "I dagens snabbrörliga digitala landskap"
- "Det är viktigt att notera"
- "När det kommer till" → skriv "om" eller "med"
- "Lyfta ert varumärke" / "ta ert företag till nästa nivå"
- "Skräddarsy" / "skräddarsydda lösningar"
- "Sömlös" / "sömlöst integrerad"
- "Kraftfull" som adjektiv
- "Unleash", "elevate", "empower", "leverage"
- "I en värld där..."
- "Oavsett om du är..."
- "Kort sagt" / "sammanfattningsvis" / "slutligen"
- "Det råder ingen tvekan om att"
- "Låt oss dyka ner i" / "låt oss utforska"
- "Game changer" / "revolutionerande" / "banbrytande"
- "Fördelar inkluderar:" följt av bullet-lista (skriv prosa istället)

FÖRBJUDNA STRUKTURER:
- Inga "i denna artikel kommer vi att"-inledningar.
- Ingen "sammanfattning"-sektion längst ner.
- Inga tre-punkts-meningsrytmer ("snabbt, enkelt och effektivt").
- Inga adjektiv-staplar ("modern, skalbar och framtidssäker").
- Inga emdash-jämförelser ("inte bara X — utan också Y").
- Inga bullet-listor där varje punkt börjar med samma verb.
- Inga rubriker som är frågor bara för att det är frågor.

SPRÅK:
- Sverigesvenska. Inte finlandssvenska eller översatt amerikanska.
- Datum: "15 mars 2026", inte "mars 15, 2026".
- Priser: "80 000 kr" med mellanslag, inte "80.000 kr" eller "80,000 SEK".
- Procent: "15 procent" i prosa, "15%" i tabeller.
- Tusentalsavgränsare: mellanslag (80 000), inte komma.

INNEHÅLLSSTANDARD:
- Varje påstående ska vara konkret. "Dyrt" → "25 000–80 000 kr".
- Variera svenska exempel: nämn Östergötland, Jönköping, Skellefteå – inte bara Stockholm/Göteborg/Malmö.
- Inga fabricerade citat från fiktiva personer.
- Inga påhittade statistik-siffror. Hellre "de flesta byråer tar mellan X och Y" än "78% av byråer tar Z".

FORMAT I OUTPUT:
- Använd markdown i section content: **fet** för nyckelbegrepp, | tabeller | för priser, - bullets SPARSAMT.
- Blanda prosa och listor. Listor är inte default – prosa är default.
- Ingen section ska vara kortare än 300 tecken. Ingen längre än 1200.
- Korta stycken (2-4 meningar), tydliga rubriker, sammanhängande text.

STRUKTUR PER ARTIKEL:
- intro (400-500 tecken): etablera trovärdighet direkt med konkret data eller en skarp observation. INGEN "i denna artikel"-mening.
- 6-8 sections med beskrivande rubriker (inte frågor, inte click-bait).
- 5-7 FAQ-frågor i slutet.
- relatedLinks: 5-7 interna länkar.

KRITERIUM: En läsare ska inte kunna säga "detta är skrivet av AI". En läsare ska tänka "detta är skrivet av någon som faktiskt jobbar med det här".`;

const BLOCKED_PHRASES = [
  "navigera den digitala",
  "navigera i den digitala",
  "snabbrörliga digitala landskap",
  "det är viktigt att notera",
  "lyfta ert varumärke",
  "lyfta ditt varumärke",
  "ta ert företag till nästa nivå",
  "ta ditt företag till nästa nivå",
  "sömlös",
  "sömlöst",
  "skräddarsy",
  "skräddarsydd",
  "låt oss dyka",
  "låt oss utforska",
  "i en värld där",
  "game changer",
  "banbrytande",
  "revolutionerande",
  "det råder ingen tvekan",
  "kort sagt,",
  "sammanfattningsvis",
  "i denna artikel kommer vi",
  "i denna artikel ska vi",
  "oavsett om du är",
];

function buildUserPrompt(input: {
  topic: string;
  targetKeyword: string;
  category: string;
  city?: string;
  articleType: string;
  minLength: number;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Skriv en artikel för Updro.

Ämne: ${input.topic}
Målkeyword: ${input.targetKeyword}
Kategori: ${input.category}
${input.city ? `Stad/region: ${input.city}` : ""}
Artikeltyp: ${input.articleType}
Minsta längd: ${input.minLength} tecken

Returnera ENDAST giltig JSON i detta format (ingen markdown-wrap, ingen förklaring före eller efter):

{
  "slug": "kebab-case-url-slug",
  "metaTitle": "max 60 tecken, inkludera keyword tidigt",
  "metaDesc": "140-155 tecken, naturlig säljande ton",
  "h1": "kan vara längre än metaTitle, beskrivande",
  "category": "${input.category}",
  "publishedDate": "${today}",
  "updatedDate": "${today}",
  "readTimeMinutes": <räkna: tecken / 1500>,
  "intro": "400-500 tecken, direkt och konkret",
  "sections": [
    { "heading": "Beskrivande rubrik", "content": "400-1200 tecken markdown" }
  ],
  "faq": [
    { "q": "Fråga", "a": "Svar 100-300 tecken" }
  ],
  "relatedLinks": [
    { "label": "Rubrik", "href": "/sökväg" }
  ]
}

Följ röstreglerna strikt. Om du märker att du skriver en förbjuden fras – skriv om stycket.`;
}

async function callGemini(messages: Array<{ role: string; content: string }>, apiKey: string) {
  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.8,
        max_tokens: 8192,
      }),
    }
  );
  return response;
}

function extractJson(content: string): any | null {
  // Strip code fences if present
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Find first { and last }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  const jsonStr = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function fullText(article: any): string {
  const parts: string[] = [
    article.intro || "",
    ...(article.sections || []).map((s: any) => `${s.heading}\n${s.content}`),
    ...(article.faq || []).map((f: any) => `${f.q}\n${f.a}`),
  ];
  return parts.join("\n\n");
}

function findBlockedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BLOCKED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
}

function validateStructure(article: any): string[] {
  const errs: string[] = [];
  const required = ["slug", "metaTitle", "metaDesc", "h1", "category", "intro", "sections", "faq", "relatedLinks"];
  for (const k of required) {
    if (!article[k]) errs.push(`saknar fält: ${k}`);
  }
  if (Array.isArray(article.sections) && article.sections.length < 4) {
    errs.push(`för få sections (${article.sections.length}, behöver minst 4)`);
  }
  if (Array.isArray(article.faq) && article.faq.length < 3) {
    errs.push(`för få FAQ (${article.faq.length}, behöver minst 3)`);
  }
  return errs;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      topic,
      targetKeyword,
      category,
      city,
      articleType = "guide",
      minLength = 5000,
    } = body;

    if (!topic || !category) {
      return new Response(
        JSON.stringify({ error: "topic och category krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = buildUserPrompt({
      topic,
      targetKeyword: targetKeyword || topic,
      category,
      city,
      articleType,
      minLength,
    });

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    let article: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    const issues: string[] = [];

    while (attempts < maxAttempts) {
      attempts++;
      const response = await callGemini(messages, LOVABLE_API_KEY);

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "För många förfrågningar mot AI – försök igen om en stund." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI-krediter slut. Lägg till krediter i Lovable-workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(
          JSON.stringify({ error: `AI-fel (${response.status})` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      console.log(`Attempt ${attempts}: received ${content.length} chars`);

      const parsed = extractJson(content);
      if (!parsed) {
        issues.push(`attempt ${attempts}: JSON-parsning failade`);
        messages.push({ role: "assistant", content });
        messages.push({
          role: "user",
          content: "Du skickade inte giltig JSON. Skicka ENDAST ett rent JSON-objekt – ingen markdown, inga förklaringar.",
        });
        continue;
      }

      const structureErrs = validateStructure(parsed);
      const text = fullText(parsed);
      const totalLen = text.length;
      const blocked = findBlockedPhrases(text);

      console.log(`Attempt ${attempts}: len=${totalLen}, blocked=${blocked.length}, structureErrs=${structureErrs.length}`);

      if (structureErrs.length === 0 && blocked.length === 0 && totalLen >= minLength * 0.85) {
        article = parsed;
        break;
      }

      // Build a regenerate-prompt with specific issues
      const fixList: string[] = [];
      if (structureErrs.length > 0) fixList.push(`Strukturfel: ${structureErrs.join(", ")}.`);
      if (blocked.length > 0) fixList.push(`Du använde förbjudna fraser: ${blocked.join(", ")}. Skriv om de styckena utan dem.`);
      if (totalLen < minLength * 0.85) fixList.push(`Texten är för kort (${totalLen} tecken, behöver minst ${Math.round(minLength * 0.85)}). Utöka sections med mer konkret innehåll.`);

      issues.push(`attempt ${attempts}: ${fixList.join(" ")}`);

      // Keep the last AI response so it knows what to fix
      messages.push({ role: "assistant", content: JSON.stringify(parsed) });
      messages.push({
        role: "user",
        content: `Det fanns problem med din artikel:\n${fixList.join("\n")}\n\nSkicka tillbaka HELA den korrigerade JSON:en. Endast JSON, inga förklaringar.`,
      });

      // If we already have *some* valid article, keep it as fallback
      if (structureErrs.length === 0 && !article) {
        article = parsed;
      }
    }

    if (!article) {
      return new Response(
        JSON.stringify({ error: "Kunde inte generera giltig artikel efter " + maxAttempts + " försök", issues }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ article, attempts, issues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-article error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
