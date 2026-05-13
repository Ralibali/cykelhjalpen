import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Eye, EyeOff, Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Guide {
  id: string
  title: string
  slug: string
  description: string
  content: string
  category: string | null
  is_published: boolean | null
  published_at: string | null
  reading_time_minutes: number | null
}

const emptyGuide: Omit<Guide, 'id'> = {
  title: '', slug: '', description: '', content: '', category: '', is_published: true, published_at: null, reading_time_minutes: 5,
}

const AdminGuides = () => {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Guide | null>(null)
  const [form, setForm] = useState(emptyGuide)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiCategory, setAiCategory] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const fetchGuides = async () => {
    const { data } = await supabase.from('guides').select('*').order('published_at', { ascending: false })
    if (data) setGuides(data as Guide[])
    setLoading(false)
  }

  useEffect(() => { fetchGuides() }, [])

  const openNew = () => { setEditing(null); setForm(emptyGuide); setDialogOpen(true) }
  const openEdit = (g: Guide) => { setEditing(g); setForm(g); setDialogOpen(true) }

  const slugify = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSave = async () => {
    const slug = form.slug || slugify(form.title)
    const payload = { ...form, slug, published_at: form.is_published ? new Date().toISOString() : null }

    if (editing) {
      const { error } = await supabase.from('guides').update(payload).eq('id', editing.id)
      if (error) { toast.error('Kunde inte uppdatera: ' + error.message); return }
      toast.success('Guide uppdaterad')
    } else {
      const { error } = await supabase.from('guides').insert(payload)
      if (error) { toast.error('Kunde inte skapa: ' + error.message); return }
      toast.success('Guide skapad')
    }
    setDialogOpen(false)
    fetchGuides()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Radera denna guide?')) return
    const { error } = await supabase.from('guides').delete().eq('id', id)
    if (error) { toast.error('Kunde inte radera'); return }
    toast.success('Guide raderad')
    fetchGuides()
  }

  const togglePublish = async (g: Guide) => {
    const newStatus = !g.is_published
    await supabase.from('guides').update({ is_published: newStatus, published_at: newStatus ? new Date().toISOString() : null }).eq('id', g.id)
    fetchGuides()
  }

  const handleGenerateArticle = async () => {
    if (!aiTopic.trim()) { toast.error('Ange ett ämne'); return }
    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: { topic: aiTopic, category: aiCategory, keywords: aiKeywords },
      })
      if (error) throw error
      if (data?.error) { toast.error(data.error); return }

      setForm({
        ...emptyGuide,
        title: data.title || aiTopic,
        slug: slugify(data.title || aiTopic),
        description: data.description || '',
        content: data.content || '',
        category: aiCategory || '',
        reading_time_minutes: data.reading_time_minutes || 5,
        is_published: false,
      })
      setAiOpen(false)
      setDialogOpen(true)
      setEditing(null)
      toast.success('Artikelutkast genererat! Granska och redigera innan publicering. ✨')
    } catch (e: any) {
      toast.error('Kunde inte generera artikel just nu.')
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Guider</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setAiTopic(''); setAiKeywords(''); setAiCategory(''); setAiOpen(true) }} size="sm" variant="outline" className="gap-1.5">
            <Wand2 className="h-4 w-4" />Generera med AI
          </Button>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Ny guide</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laddar...</p>
      ) : guides.length === 0 ? (
        <p className="text-muted-foreground">Inga guider ännu.</p>
      ) : (
        <div className="space-y-2">
          {guides.map(g => (
            <div key={g.id} className="bg-card rounded-xl border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{g.title}</p>
                  <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5',
                    g.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                  )}>{g.is_published ? 'Publicerad' : 'Utkast'}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">/{g.slug} · {g.category || 'Ingen kategori'} · {g.reading_time_minutes} min</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(g)}>
                  {g.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(g.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Generate Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Generera artikel med AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Ämne / rubrik *</label>
              <Input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="T.ex. Så väljer du rätt webbyrå 2025"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori (valfritt)</label>
              <Input
                value={aiCategory}
                onChange={e => setAiCategory(e.target.value)}
                placeholder="T.ex. Webbutveckling, SEO, E-handel"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nyckelord (valfritt)</label>
              <Input
                value={aiKeywords}
                onChange={e => setAiKeywords(e.target.value)}
                placeholder="T.ex. webbyrå, offert, pris"
              />
            </div>
            <Button onClick={handleGenerateArticle} disabled={aiLoading || !aiTopic.trim()} className="w-full gap-2">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {aiLoading ? 'Genererar artikel...' : 'Generera utkast'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Artikeln skapas som utkast – granska innan publicering.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Redigera guide' : 'Ny guide'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Titel</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Beskrivning</label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Lästid (minuter)</label>
              <Input type="number" value={form.reading_time_minutes || 5} onChange={e => setForm({ ...form, reading_time_minutes: parseInt(e.target.value) || 5 })} />
            </div>
            <div>
              <label className="text-sm font-medium">Innehåll (Markdown)</label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={12} className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published ?? true} onCheckedChange={v => setForm({ ...form, is_published: v })} />
              <span className="text-sm">Publicerad</span>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Spara ändringar' : 'Skapa guide'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminGuides
