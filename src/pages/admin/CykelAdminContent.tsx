import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Archive, CheckCircle2, ExternalLink, FileText, Loader2, Plus, RefreshCw, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { CYKEL_SERVICE_STEMS } from '@/lib/cykelSeoPages'
import {
  V2_CONTENT_PUBLISH_MONTHLY_CAP,
  contentPublishBlockers,
  normalizeGuidePath,
  type V2ContentPageRow,
} from '@/lib/v2/content'

// V2 content manager (S7). All mutations go through the v2-content-publish
// edge function, which enforces the editorial gate (reviewer + reviewed_at)
// and the monthly publish cap (G-C1 scaled-content guard) server-side.

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  in_review: 'Granskas',
  published: 'Publicerad',
  archived: 'Arkiverad',
}

interface FormState {
  path: string
  page_type: string
  indexability: string
  title: string
  description: string
  body_markdown: string
  author_name: string
  author_title: string
  reviewer_name: string
  reviewer_title: string
  reviewed_at: string // datetime-local
  city_slugs: string[]
  service_categories: string[]
  related_paths: string // comma-separated
}

const EMPTY_FORM: FormState = {
  path: '',
  page_type: 'guide',
  indexability: 'noindex',
  title: '',
  description: '',
  body_markdown: '',
  author_name: '',
  author_title: '',
  reviewer_name: '',
  reviewer_title: '',
  reviewed_at: '',
  city_slugs: [],
  service_categories: [],
  related_paths: '',
}

const formFromRow = (row: V2ContentPageRow): FormState => ({
  path: row.path,
  page_type: row.page_type,
  indexability: row.indexability,
  title: row.title ?? '',
  description: row.description ?? '',
  body_markdown: row.body_markdown ?? '',
  author_name: row.author_name ?? '',
  author_title: row.author_title ?? '',
  reviewer_name: row.reviewer_name ?? '',
  reviewer_title: row.reviewer_title ?? '',
  reviewed_at: row.reviewed_at ? row.reviewed_at.slice(0, 16) : '',
  city_slugs: row.city_slugs ?? [],
  service_categories: row.service_categories ?? [],
  related_paths: (row.related_paths ?? []).join(', '),
})

const functionErrorMessage = async (error: unknown, fallback: string) => {
  const response = (error as { context?: unknown })?.context
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json()
      if (payload?.error) return payload.error as string
    } catch { /* fall through */ }
  }
  return fallback
}

const toggleInList = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const CykelAdminContent = () => {
  const [pages, setPages] = useState<V2ContentPageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    // Cast: generated supabase types predate the v2_* tables (regeneration = S13).
    const { data, error } = await (supabase as any)
      .from('v2_content_pages')
      .select('*')
      .eq('host', 'cykelhjalpen')
      .order('updated_at', { ascending: false })
    if (error) toast.error(`Kunde inte läsa innehåll: ${error.message}`)
    setPages((data as unknown as V2ContentPageRow[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selected = useMemo(
    () => (selectedId && selectedId !== 'new' ? pages.find((p) => p.id === selectedId) ?? null : null),
    [pages, selectedId],
  )

  const normalizedPath = useMemo(() => normalizeGuidePath(form.path), [form.path])

  const blockers = useMemo(() => contentPublishBlockers({
    title: form.title,
    body_markdown: form.body_markdown,
    reviewer_name: form.reviewer_name,
    reviewed_at: form.reviewed_at ? new Date(form.reviewed_at).toISOString() : null,
  }), [form])

  const fieldsPayload = () => ({
    page_type: form.page_type,
    indexability: form.indexability,
    title: form.title.trim(),
    description: form.description.trim() || null,
    body_markdown: form.body_markdown,
    author_name: form.author_name.trim() || null,
    author_title: form.author_title.trim() || null,
    reviewer_name: form.reviewer_name.trim() || null,
    reviewer_title: form.reviewer_title.trim() || null,
    reviewed_at: form.reviewed_at ? new Date(form.reviewed_at).toISOString() : null,
    city_slugs: form.city_slugs,
    service_categories: form.service_categories,
    related_paths: form.related_paths
      .split(',')
      .map((s) => normalizeGuidePath(s) ?? s.trim())
      .filter(Boolean),
  })

  const runAction = async (action: 'save_draft' | 'submit_review' | 'publish' | 'archive') => {
    const path = normalizeGuidePath(form.path)
    if (!path) {
      toast.error('Ogiltig sökväg — använd t.ex. /guider/byta-dack (gemener och bindestreck).')
      return
    }
    setBusy(action)
    const { data, error } = await supabase.functions.invoke('v2-content-publish', {
      body: { path, action, fields: fieldsPayload() },
    })
    setBusy(null)
    if (error || data?.error) {
      toast.error(data?.error || await functionErrorMessage(error, 'Åtgärden misslyckades.'))
      return
    }
    toast.success(`Sparat — status: ${STATUS_LABELS[data?.status] ?? data?.status}`)
    await load()
    if (data?.page_id) setSelectedId(data.page_id)
  }

  const selectPage = (id: string | 'new') => {
    setSelectedId(id)
    setForm(id === 'new' ? EMPTY_FORM : formFromRow(pages.find((p) => p.id === id)!))
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <CykelAdminLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Innehåll — guider (V2)</h1>
            <p className="text-sm text-muted-foreground">
              Redaktionell yta för v2_content_pages. Publicering kräver namngiven granskare +
              granskningsdatum, max {V2_CONTENT_PUBLISH_MONTHLY_CAP} nya publiceringar per 30 dagar.
              Publik routing styrs av flaggan <code>v2.seo.content_surface</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => selectPage('new')}>
              <Plus className="h-4 w-4 mr-1" /> Ny guide
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          {/* List */}
          <div className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Laddar…</p>}
            {!loading && pages.length === 0 && (
              <p className="text-sm text-muted-foreground">Inga sidor ännu.</p>
            )}
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => selectPage(page.id)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selectedId === page.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{page.title || page.path}</span>
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[page.status] ?? page.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{page.path}</p>
              </button>
            ))}
          </div>

          {/* Editor */}
          {selectedId === null ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Välj en sida till vänster eller skapa en ny guide.
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="path">Sökväg (slug)</Label>
                  <Input
                    id="path"
                    value={form.path}
                    onChange={(e) => set('path', e.target.value)}
                    placeholder="sa-valjer-du-cykelverkstad"
                    disabled={selectedId !== 'new'}
                  />
                  {selectedId === 'new' && form.path && (
                    <p className="text-xs text-muted-foreground">
                      {normalizedPath ? `Blir: ${normalizedPath}` : 'Ogiltig slug'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Sidtyp</Label>
                    <Select value={form.page_type} onValueChange={(v) => set('page_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="report">Rapport</SelectItem>
                        <SelectItem value="city_hub_extra">Stadshub-extra</SelectItem>
                        <SelectItem value="tool">Verktyg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Indexering</Label>
                    <Select value={form.indexability} onValueChange={(v) => set('indexability', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="index">index</SelectItem>
                        <SelectItem value="noindex">noindex</SelectItem>
                        <SelectItem value="auto">auto (→ noindex tills trösklar finns)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Rubrik (meta title)</Label>
                <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Meta description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Brödtext (markdown — ## rubriker, - listor, | tabeller |, **fet**)</Label>
                <Textarea
                  id="body"
                  rows={14}
                  className="font-mono text-sm"
                  value={form.body_markdown}
                  onChange={(e) => set('body_markdown', e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="author">Författare</Label>
                  <Input id="author" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="authorTitle">Författartitel</Label>
                  <Input
                    id="authorTitle"
                    placeholder="Cykelhjälpens redaktion"
                    value={form.author_title}
                    onChange={(e) => set('author_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reviewer">Granskare (mekaniker) — krävs för publicering</Label>
                  <Input id="reviewer" value={form.reviewer_name} onChange={(e) => set('reviewer_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reviewerTitle">Granskartitel</Label>
                  <Input
                    id="reviewerTitle"
                    placeholder="Cykelmekaniker, 15 års erfarenhet"
                    value={form.reviewer_title}
                    onChange={(e) => set('reviewer_title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reviewedAt">Granskad datum — krävs för publicering</Label>
                  <Input
                    id="reviewedAt"
                    type="datetime-local"
                    value={form.reviewed_at}
                    onChange={(e) => set('reviewed_at', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="related">Relaterade guider (sökvägar, kommaseparerade)</Label>
                  <Input
                    id="related"
                    placeholder="/guider/annan-guide"
                    value={form.related_paths}
                    onChange={(e) => set('related_paths', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Städer (länkar + relateringslogik)</Label>
                  <div className="mt-2 space-y-1.5">
                    {CYKEL_CITIES.map((city) => (
                      <label key={city.slug} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.city_slugs.includes(city.slug)}
                          onCheckedChange={() => set('city_slugs', toggleInList(form.city_slugs, city.slug))}
                        />
                        {city.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Tjänster (service_categories)</Label>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-2">
                    {CYKEL_SERVICE_STEMS.map((stem) => (
                      <label key={stem} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.service_categories.includes(stem)}
                          onCheckedChange={() => set('service_categories', toggleInList(form.service_categories, stem))}
                        />
                        <span className="font-mono text-xs">{stem}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {blockers.length > 0 && selected?.status !== 'published' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Saknas för publicering: {blockers.map((b) => ({
                    missing_title: 'rubrik',
                    missing_body: 'brödtext',
                    missing_reviewer_name: 'granskare',
                    missing_reviewed_at: 'granskningsdatum',
                  } as Record<string, string>)[b] ?? b).join(', ')}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => runAction('save_draft')}
                >
                  {busy === 'save_draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Spara utkast'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => runAction('submit_review')}
                >
                  {busy === 'submit_review' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Skicka för granskning
                </Button>
                <Button
                  disabled={busy !== null || blockers.length > 0}
                  onClick={() => runAction('publish')}
                >
                  {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Publicera
                </Button>
                {selected?.status === 'published' && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={selected.path} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Visa
                    </a>
                  </Button>
                )}
                {selected && selected.status !== 'archived' && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy !== null}
                    onClick={() => runAction('archive')}
                  >
                    <Archive className="h-4 w-4 mr-1" /> Arkivera
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CykelAdminLayout>
  )
}

export default CykelAdminContent
