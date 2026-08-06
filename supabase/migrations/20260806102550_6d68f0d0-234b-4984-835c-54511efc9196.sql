UPDATE public.outreach_activities
SET message = replace(message, 'cykelhjalpen.se/for-verkstader', 'cykelhjalpen.se/for-cykelverkstader'),
    updated_at = now()
WHERE sent_at IS NULL
  AND message LIKE '%cykelhjalpen.se/for-verkstader%';