import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Send, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/dateUtils'

interface Conversation {
  otherId: string
  otherName: string
  projectTitle: string
  projectId: string
  lastMessage: string
  lastAt: string
  unread: number
}

const ChatPage = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const fetchConvos = async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, company_name), project:projects!messages_project_id_fkey(title)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!msgs) return

      const convoMap = new Map<string, Conversation>()
      msgs.forEach((m: any) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id
        const key = `${otherId}-${m.project_id}`
        if (!convoMap.has(key)) {
          convoMap.set(key, {
            otherId,
            otherName: m.sender_id === user.id ? 'Motpart' : (m.sender?.company_name || m.sender?.full_name || 'Okänd'),
            projectTitle: m.project?.title || '',
            projectId: m.project_id,
            lastMessage: m.content,
            lastAt: m.created_at,
            unread: m.receiver_id === user.id && !m.is_read ? 1 : 0,
          })
        }
      })
      setConversations(Array.from(convoMap.values()))
    }
    fetchConvos()
  }, [user])

  useEffect(() => {
    if (!activeConvo || !user) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', activeConvo.projectId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeConvo.otherId}),and(sender_id.eq.${activeConvo.otherId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
      await supabase.from('messages').update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', activeConvo.otherId)
        .eq('project_id', activeConvo.projectId)
    }
    fetchMessages()

    const channel = supabase
      .channel('chat-' + activeConvo.projectId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${activeConvo.projectId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvo, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvo || !user) return
    await supabase.from('messages').insert({
      project_id: activeConvo.projectId,
      sender_id: user.id,
      receiver_id: activeConvo.otherId,
      content: newMsg.trim(),
    })
    setNewMsg('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      <div className="flex h-[calc(100vh-10rem)] bg-card rounded-xl border overflow-hidden">
        {/* Conversation list - hidden on mobile when a convo is active */}
        <div className={cn(
          'w-full md:w-80 border-r flex flex-col',
          activeConvo ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-3 border-b font-display font-semibold text-sm">Meddelanden</div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Inga meddelanden ännu</p>
            ) : conversations.map(c => (
              <button
                key={`${c.otherId}-${c.projectId}`}
                onClick={() => setActiveConvo(c)}
                className={cn('w-full text-left p-3 border-b hover:bg-muted/50 transition-colors', activeConvo?.otherId === c.otherId && activeConvo?.projectId === c.projectId ? 'bg-primary/5' : '')}
              >
                <p className="text-sm font-medium truncate">{c.otherName}</p>
                <p className="text-xs text-muted-foreground truncate">{c.projectTitle}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window - full width on mobile when active */}
        <div className={cn(
          'flex-1 flex flex-col',
          activeConvo ? 'flex' : 'hidden md:flex'
        )}>
          {!activeConvo ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Välj en konversation
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center gap-2">
                <button onClick={() => setActiveConvo(null)} className="md:hidden p-1 rounded-lg hover:bg-muted">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="font-semibold text-sm">{activeConvo.otherName}</p>
                  <p className="text-xs text-muted-foreground">{activeConvo.projectTitle}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={cn('max-w-[70%]', m.sender_id === user?.id ? 'ml-auto' : '')}>
                    <div className={cn('rounded-2xl px-4 py-2 text-sm', m.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {m.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(m.created_at)}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Skriv ett meddelande..."
                  className="rounded-xl"
                />
                <Button size="icon" onClick={sendMessage} className="bg-primary hover:bg-primary/90 rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default ChatPage
