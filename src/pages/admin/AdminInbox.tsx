import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import {
  Archive, ArchiveRestore, Inbox as InboxIcon, Loader2, MailPlus, RefreshCw,
  Reply, Send, ArrowLeft, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildReplySubject, emailSnippet, formatMailDate } from '@/lib/emailFormat'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'
import InboundWebhookCard from '@/components/admin/InboundWebhookCard'


// Tables not present in generated types yet (inbound_emails / sent_emails).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const looseDb = supabase as any


// Edge-funktioner svarar med { error: "riktigt felmeddelande" } i bodyn vid non-2xx,
// men functions.invoke exponerar bara en generisk text. Läs bodyn för riktiga felet.
const extractFunctionError = async (error: unknown): Promise<string> => {
  const err = error as { message?: string; context?: { json?: () => Promise<unknown> } }
  try {
    const body = await err?.context?.json?.() as { error?: unknown; message?: unknown } | undefined
    if (body?.error) return String(body.error)
    if (body?.message) return String(body.message)
  } catch { /* body kunde inte läsas – fall tillbaka */ }
  return err?.message ?? 'Okänt fel'
}

interface InboundEmail {
  id: string
  from_email: string
  from_name: string | null
  to_emails: string[]
  subject: string | null
  text_body: string | null
  html_body: string | null
  received_at: string
  read_at: string | null
  replied_at: string | null
  archived_at: string | null
  prospect_id: string | null
}

interface SentEmail {
  id: string
  to_emails: string[]
  subject: string
  text_body: string
  status: string
  error: string | null
  created_at: string
}

const AdminInbox = () => {
  const t = useT()
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [inbound, setInbound] = useState<InboundEmail[]>([])
  const [sent, setSent] = useState<SentEmail[]>([])
  const [prospectNames, setProspectNames] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<InboundEmail | null>(null)
  const [selectedSent, setSelectedSent] = useState<SentEmail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [compose, setCompose] = useState({ to: '', subject: '', message: '' })

  const fetchInbox = useCallback(async () => {
    setLoading(true)
    const { data, error } = await looseDb
      .from('inbound_emails')
      .select('id, from_email, from_name, to_emails, subject, text_body, html_body, received_at, read_at, replied_at, archived_at, prospect_id')
      .order('received_at', { ascending: false })
      .limit(200)
    if (error) {
      toast.error(t('Kunde inte läsa inkorgen'), { description: error.message })
      setLoading(false)
      return
    }
    const rows = (data || []) as InboundEmail[]
    setInbound(rows)

    const prospectIds = [...new Set(rows.map((r) => r.prospect_id).filter((id): id is string => Boolean(id)))]
    if (prospectIds.length > 0) {
      const { data: prospects } = await supabase
        .from('workshop_prospects')
        .select('id, company_name')
        .in('id', prospectIds)
      const map: Record<string, string> = {}
      for (const p of prospects || []) map[p.id as string] = p.company_name as string
      setProspectNames(map)
    }
    setLoading(false)
  }, [])

  const fetchSent = useCallback(async () => {
    const { data, error } = await looseDb
      .from('sent_emails')
      .select('id, to_emails, subject, text_body, status, error, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      toast.error(t('Kunde inte läsa skickade mejl'), { description: error.message })
      return
    }
    setSent((data || []) as SentEmail[])
  }, [])

  useEffect(() => { fetchInbox() }, [fetchInbox])
  useEffect(() => { if (tab === 'sent') fetchSent() }, [tab, fetchSent])

  const visibleInbound = useMemo(
    () => inbound.filter((m) => showArchived || !m.archived_at),
    [inbound, showArchived],
  )
  const unreadCount = useMemo(
    () => inbound.filter((m) => !m.read_at && !m.archived_at).length,
    [inbound],
  )

  const openMessage = async (message: InboundEmail) => {
    setSelected(message)
    setReplyText('')
    if (!message.read_at) {
      const readAt = new Date().toISOString()
      setInbound((prev) => prev.map((m) => (m.id === message.id ? { ...m, read_at: readAt } : m)))
      setSelected((prev) => (prev && prev.id === message.id ? { ...prev, read_at: readAt } : prev))
      await looseDb.from('inbound_emails').update({ read_at: readAt }).eq('id', message.id)
    }
  }

  const toggleArchive = async (message: InboundEmail) => {
    const archivedAt = message.archived_at ? null : new Date().toISOString()
    setInbound((prev) => prev.map((m) => (m.id === message.id ? { ...m, archived_at: archivedAt } : m)))
    setSelected((prev) => (prev && prev.id === message.id ? { ...prev, archived_at: archivedAt } : prev))
    const { error } = await looseDb.from('inbound_emails').update({ archived_at: archivedAt }).eq('id', message.id)
    if (error) toast.error(t('Kunde inte arkivera'), { description: error.message })
    else toast.success(archivedAt ? t('Mejlet arkiverat') : t('Mejlet återställt'))
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim() || sending) return
    setSending(true)
    const { error } = await supabase.functions.invoke('admin-send-email', {
      body: {
        to: selected.from_email,
        subject: buildReplySubject(selected.subject),
        message: replyText.trim(),
        inReplyToInboundId: selected.id,
        prospectId: selected.prospect_id || undefined,
      },
    })
    setSending(false)
    if (error) {
      toast.error(t('Sändning misslyckades'), { description: await extractFunctionError(error) })
      return
    }
    const repliedAt = new Date().toISOString()
    setInbound((prev) => prev.map((m) => (m.id === selected.id ? { ...m, replied_at: repliedAt } : m)))
    setSelected((prev) => (prev ? { ...prev, replied_at: repliedAt } : prev))
    setReplyText('')
    toast.success(t('Svar skickat'), { description: t('Till {email}', { email: selected.from_email }) })
  }

  const sendCompose = async () => {
    if (sending) return
    if (!compose.to.trim() || !compose.subject.trim() || !compose.message.trim()) {
      toast.error(t('Fyll i mottagare, ämne och meddelande'))
      return
    }
    setSending(true)
    const { error } = await supabase.functions.invoke('admin-send-email', {
      body: {
        to: compose.to.trim(),
        subject: compose.subject.trim(),
        message: compose.message.trim(),
      },
    })
    setSending(false)
    if (error) {
      toast.error(t('Sändning misslyckades'), { description: await extractFunctionError(error) })
      return
    }
    setComposeOpen(false)
    setCompose({ to: '', subject: '', message: '' })
    toast.success(t('Mejlet skickat'), { description: t('Till {email}', { email: compose.to.trim() }) })
    if (tab === 'sent') fetchSent()
  }

  const senderLabel = (m: InboundEmail) => m.from_name || m.from_email



  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">{t('Mejl')}</h1>
            <p className="text-sm text-muted-foreground">
              info@cykelhjalpen.se{unreadCount > 0 ? t(' · {n} olästa', { n: unreadCount }) : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchInbox(); if (tab === 'sent') fetchSent() }}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> {t('Uppdatera')}
            </Button>
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <MailPlus className="h-4 w-4 mr-1.5" /> {t('Nytt mejl')}
            </Button>
          </div>
        </div>

        <InboundWebhookCard />



        <div className="flex gap-2 mb-4">
          <Button variant={tab === 'inbox' ? 'default' : 'outline'} size="sm" onClick={() => setTab('inbox')}>
            <InboxIcon className="h-4 w-4 mr-1.5" /> {t('Inkorg')}
          </Button>
          <Button variant={tab === 'sent' ? 'default' : 'outline'} size="sm" onClick={() => setTab('sent')}>
            <Send className="h-4 w-4 mr-1.5" /> {t('Skickat')}
          </Button>
          {tab === 'inbox' && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowArchived((v) => !v)}>
              <Archive className="h-4 w-4 mr-1.5" /> {showArchived ? t('Dölj arkiverade') : t('Visa arkiverade')}
            </Button>
          )}
        </div>

        {tab === 'inbox' ? (
          <div className="grid gap-4 md:grid-cols-[minmax(280px,340px)_1fr]">
            {/* Lista */}
            <div className={cn('space-y-1.5', selected && 'hidden md:block')}>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : visibleInbound.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                  {t('Inga mejl ännu. Mejl till info@cykelhjalpen.se dyker upp här.')}
                </div>
              ) : visibleInbound.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className={cn(
                    'w-full text-left rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50',
                    selected?.id === m.id && 'border-primary',
                    m.archived_at && 'opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!m.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <span className={cn('text-sm truncate', !m.read_at ? 'font-semibold' : 'font-medium')}>
                      {senderLabel(m)}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{formatMailDate(m.received_at)}</span>
                  </div>
                  <p className={cn('text-sm truncate mt-0.5', !m.read_at ? 'font-semibold' : 'text-muted-foreground')}>
                    {m.subject || t('(utan ämne)')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{emailSnippet(m.text_body)}</p>
                  {m.prospect_id && (
                    <span className="inline-block mt-1.5 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {prospectNames[m.prospect_id] || t('Prospekt')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Detalj */}
            <div className={cn(!selected && 'hidden md:block')}>
              {!selected ? (
                <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
                  {t('Välj ett mejl för att läsa det.')}
                </div>
              ) : (
                <div className="rounded-xl border bg-card">
                  <div className="p-4 border-b">
                    <button onClick={() => setSelected(null)} className="md:hidden inline-flex items-center text-sm text-muted-foreground mb-2">
                      <ArrowLeft className="h-4 w-4 mr-1" /> {t('Inkorg')}
                    </button>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-lg break-words">{selected.subject || t('(utan ämne)')}</h2>
                        <p className="text-sm text-muted-foreground break-all">
                          {selected.from_name ? `${selected.from_name} ` : ''}&lt;{selected.from_email}&gt;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('Till {emails}', { emails: selected.to_emails.join(', ') || 'info@cykelhjalpen.se' })} · {new Date(selected.received_at).toLocaleString('sv-SE')}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selected.prospect_id && (
                            <Link
                              to="/admin/prospekt"
                              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 hover:bg-primary/20"
                            >
                              {prospectNames[selected.prospect_id] || t('Prospekt')} <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          {selected.replied_at && (
                            <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                              {t('Svarat {date}', { date: formatMailDate(selected.replied_at) })}
                            </span>
                          )}
                          {selected.archived_at && (
                            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{t('Arkiverat')}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleArchive(selected)}>
                        {selected.archived_at
                          ? <><ArchiveRestore className="h-4 w-4 mr-1.5" /> {t('Återställ')}</>
                          : <><Archive className="h-4 w-4 mr-1.5" /> {t('Arkivera')}</>}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    {selected.text_body ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{selected.text_body}</div>
                    ) : selected.html_body ? (
                      <iframe sandbox="" srcDoc={selected.html_body} title={t('Mejlinnehåll')} className="w-full h-96 rounded-lg border bg-white" />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {t('Innehållet kunde inte hämtas – mejlet finns hos Resend men kroppen saknas här.')}
                      </p>
                    )}
                  </div>

                  <div className="p-4 border-t bg-muted/30 rounded-b-xl">
                    <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <Reply className="h-4 w-4" /> {t('Svara {name}', { name: senderLabel(selected) })}
                    </label>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('Skriv ditt svar…')}
                      rows={5}
                      className="bg-card"
                    />
                    <div className="flex justify-end mt-2">
                      <Button onClick={sendReply} disabled={!replyText.trim() || sending}>
                        {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                        {t('Skicka svar')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(280px,340px)_1fr]">
            <div className={cn('space-y-1.5', selectedSent && 'hidden md:block')}>
              {sent.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                  {t('Inga skickade mejl ännu.')}
                </div>
              ) : sent.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedSent(m)}
                  className={cn(
                    'w-full text-left rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50',
                    selectedSent?.id === m.id && 'border-primary',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.to_emails.join(', ')}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{formatMailDate(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{m.subject}</p>
                  {m.status === 'failed' && (
                    <span className="inline-block mt-1.5 text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                      {t('Misslyckades')}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className={cn(!selectedSent && 'hidden md:block')}>
              {!selectedSent ? (
                <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
                  {t('Välj ett mejl för att se det.')}
                </div>
              ) : (
                <div className="rounded-xl border bg-card">
                  <div className="p-4 border-b">
                    <button onClick={() => setSelectedSent(null)} className="md:hidden inline-flex items-center text-sm text-muted-foreground mb-2">
                      <ArrowLeft className="h-4 w-4 mr-1" /> {t('Skickat')}
                    </button>
                    <h2 className="font-semibold text-lg break-words">{selectedSent.subject}</h2>
                    <p className="text-sm text-muted-foreground break-all">{t('Till {emails}', { emails: selectedSent.to_emails.join(', ') })}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(selectedSent.created_at).toLocaleString('sv-SE')}
                      {selectedSent.status === 'failed' && (
                        <span className="text-destructive"> · {t('Misslyckades')}{selectedSent.error ? `: ${selectedSent.error}` : ''}</span>
                      )}
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{selectedSent.text_body}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nytt mejl')}</DialogTitle>
            <DialogDescription>{t('Skickas från info@cykelhjalpen.se.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t('Till')}</label>
              <Input
                type="email"
                value={compose.to}
                onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                placeholder={t('namn@foretag.se')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('Ämne')}</label>
              <Input
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                placeholder={t('Ämne')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('Meddelande')}</label>
              <Textarea
                value={compose.message}
                onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
                placeholder={t('Skriv ditt meddelande…')}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>{t('Avbryt')}</Button>
            <Button onClick={sendCompose} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              {t('Skicka')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminInbox
