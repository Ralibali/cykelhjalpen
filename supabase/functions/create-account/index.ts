import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = new Set([
  "Webbutveckling", "E-handel", "Digital marknadsföring",
  "Grafisk design/UX", "SEO", "App-utveckling",
  "IT-konsult", "Sociala medier", "Mjukvaruutveckling",
  "Video & foto", "Varumärke & PR", "UX/Webbdesign",
  "Underhåll/IT Support", "Affärsutveckling", "AI-utveckling",
]);

const TRIAL_LEADS = 5;
const TRIAL_DAYS = 7;

type SignUpBody = {
  email?: string;
  password?: string;
  role?: string;
  full_name?: string;
  company_name?: string;
  city?: string;
  phone?: string;
  categories?: string[];
  org_number?: string;
};

function cleanText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(input: string, suffix: string) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return `${slug || "byra"}-${suffix}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metoden stöds inte." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("create-account missing backend secrets");
    return json({ error: "Registreringen är inte korrekt konfigurerad just nu." }, 500);
  }

  try {
    const body = (await req.json()) as SignUpBody;
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;
    const fullName = cleanText(body.full_name, 120);
    const companyName = cleanText(body.company_name, 160);
    const city = cleanText(body.city, 80);
    const phone = cleanText(body.phone, 40);
    const orgNumber = cleanText(body.org_number, 32);
    const categories = Array.isArray(body.categories)
      ? body.categories.filter((category) => typeof category === "string" && CATEGORIES.has(category)).slice(0, 10)
      : [];

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Ange en giltig e-postadress." }, 400);
    if (password.length < 6) return json({ error: "Lösenordet måste vara minst sex tecken." }, 400);
    if (role !== "buyer" && role !== "supplier") return json({ error: "Ogiltig kontotyp." }, 400);
    if (fullName.length < 2) return json({ error: "Ange ditt namn." }, 400);
    if (role === "supplier" && companyName.length < 2) return json({ error: "Ange byrånamn." }, 400);
    if (role === "supplier" && categories.length === 0) return json({ error: "Välj minst en kategori." }, 400);

    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const origin = req.headers.get("origin");
    const emailRedirectTo = origin && /^https?:\/\//.test(origin) ? origin : "https://updro.se";

    const { data: authData, error: authError } = await publicClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          role,
          full_name: fullName,
          company_name: companyName || null,
        },
      },
    });

    if (authError) {
      const message = authError.message.toLowerCase().includes("already")
        ? "Det finns redan ett konto med den e-postadressen. Logga in istället."
        : authError.message;
      return json({ error: message }, 400);
    }

    const user = authData.user;
    if (!user?.id) return json({ error: "Kunde inte skapa konto." }, 500);

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: user.id,
      role,
      full_name: fullName,
      email,
      company_name: companyName || null,
      city: city || null,
      phone: phone || null,
    });

    if (profileError) {
      if (profileError.code !== "23505") await adminClient.auth.admin.deleteUser(user.id);
      const message = profileError.code === "23505"
        ? "Det finns redan ett konto med den e-postadressen. Logga in istället."
        : "Kunde inte skapa profil. Försök igen.";
      console.error("create-account profile error", profileError);
      return json({ error: message }, 400);
    }

    if (role === "supplier") {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

      const { error: supplierError } = await adminClient.from("supplier_profiles").insert({
        id: user.id,
        slug: slugify(companyName || fullName, user.id.slice(0, 6)),
        plan: "trial",
        trial_ends_at: trialEnds.toISOString(),
        lead_credits: TRIAL_LEADS,
        trial_leads_used: 0,
        categories,
        org_number: orgNumber || null,
        contact_name: fullName,
        contact_email: email,
        contact_phone: phone || null,
      });

      if (supplierError) {
        await adminClient.auth.admin.deleteUser(user.id);
        console.error("create-account supplier error", supplierError);
        return json({ error: "Kunde inte skapa byråprofil. Försök igen." }, 400);
      }
    }

    return json({
      userId: user.id,
      session: authData.session,
      needsEmailConfirmation: !authData.session,
    });
  } catch (error) {
    console.error("create-account error", error);
    return json({ error: "Något gick fel vid registrering." }, 500);
  }
});