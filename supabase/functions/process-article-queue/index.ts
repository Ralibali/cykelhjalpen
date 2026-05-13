import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PER_RUN = 5;
const MAX_RETRIES = 3;
const DELAY_MS = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Missing supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pick next batch of queued items (highest priority first, then oldest)
    const { data: queueRows, error: queueErr } = await admin
      .from("article_queue")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (queueErr) {
      console.error("Queue read error", queueErr);
      return new Response(JSON.stringify({ error: queueErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!queueRows || queueRows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "Queue empty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (let i = 0; i < queueRows.length; i++) {
      const row = queueRows[i];

      // Mark as generating
      await admin
        .from("article_queue")
        .update({ status: "generating" })
        .eq("id", row.id)
        .eq("status", "queued"); // optimistic lock

      try {
        const genUrl = `${SUPABASE_URL}/functions/v1/generate-article`;
        const genResp = await fetch(genUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            topic: row.topic,
            targetKeyword: row.target_keyword,
            category: row.category,
            city: row.city || undefined,
            articleType: row.article_type,
            minLength: row.suggested_length || 5000,
          }),
        });

        if (!genResp.ok) {
          const errText = await genResp.text();
          throw new Error(`generate-article ${genResp.status}: ${errText.slice(0, 300)}`);
        }

        const genData = await genResp.json();
        const article = genData?.article;
        if (!article?.slug || !article?.h1) {
          throw new Error("Generated article missing required fields");
        }

        // Insert as draft (manual review required)
        const { data: inserted, error: insertErr } = await admin
          .from("articles")
          .insert({
            slug: article.slug,
            meta_title: article.metaTitle,
            meta_desc: article.metaDesc,
            h1: article.h1,
            category: article.category || row.category,
            article_type: row.article_type,
            city: row.city || null,
            target_keyword: row.target_keyword,
            intro: article.intro || "",
            sections: article.sections || [],
            faq: article.faq || [],
            related_links: article.relatedLinks || [],
            read_time_minutes: article.readTimeMinutes || null,
            status: "draft",
            generated_by: "gemini-2.5-pro",
          })
          .select("id")
          .single();

        if (insertErr) throw new Error(`Article insert: ${insertErr.message}`);

        await admin
          .from("article_queue")
          .update({
            status: "ready_for_review",
            generated_article_id: inserted.id,
            last_error: null,
          })
          .eq("id", row.id);

        results.push({ id: row.id, status: "ready_for_review" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Queue row ${row.id} failed`, message);

        const newRetry = (row.retry_count || 0) + 1;
        const nextStatus = newRetry >= MAX_RETRIES ? "skipped" : "queued";

        await admin
          .from("article_queue")
          .update({
            status: nextStatus,
            retry_count: newRetry,
            last_error: message.slice(0, 500),
          })
          .eq("id", row.id);

        results.push({ id: row.id, status: nextStatus, error: message });
      }

      // Rate-limit safety between calls
      if (i < queueRows.length - 1) await sleep(DELAY_MS);
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("process-article-queue error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
