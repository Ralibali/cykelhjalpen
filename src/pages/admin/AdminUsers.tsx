import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { timeAgo } from '@/lib/dateUtils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => { if (data) setUsers(data) })
  }, [])

  const filtered = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleExport = () => {
    exportCsv(filtered.map(u => ({
      Namn: u.full_name || '–',
      'E-post': u.email || '–',
      Företag: u.company_name || '–',
      Roll: u.role,
      Stad: u.city || '–',
      Telefon: u.phone || '–',
      BankID: u.is_bankid_verified ? 'Ja' : 'Nej',
      Registrerad: u.created_at ? new Date(u.created_at).toLocaleDateString('sv-SE') : '',
    })), 'anvandare')
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold">Användare</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['all', 'buyer', 'supplier', 'admin'].map(r => (
              <Button key={r} size="sm" variant={roleFilter === r ? 'default' : 'outline'} className="rounded-xl text-xs" onClick={() => setRoleFilter(r)}>
                {r === 'all' ? 'Alla' : r}
              </Button>
            ))}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök användare..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Namn</th>
            <th className="text-left p-3 font-medium">E-post</th>
            <th className="text-left p-3 font-medium">Företag</th>
            <th className="text-left p-3 font-medium">Roll</th>
            <th className="text-left p-3 font-medium">Verifierad</th>
            <th className="text-left p-3 font-medium">Registrerad</th>
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <Link to={`/admin/anvandare/${u.id}`} className="font-medium text-primary hover:underline">
                    {u.full_name || '–'}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{u.email || '–'}</td>
                <td className="p-3 text-muted-foreground">{u.company_name || '–'}</td>
                <td className="p-3">
                  <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5',
                    u.role === 'supplier' ? 'bg-primary/10 text-primary' : u.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                  )}>{u.role}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {u.is_bankid_verified && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">BankID</span>}
                    {u.is_phone_verified && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">Tel</span>}
                    {!u.is_bankid_verified && !u.is_phone_verified && <span className="text-xs text-muted-foreground">–</span>}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">Inga användare hittades.</p>}
      </div>
    </AdminLayout>
  )
}

export default AdminUsers
