import { useEffect, useState } from 'react'
import { Copy, Loader2, Mail, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { prepareProspectEmailUpdate, prospectEmailGuardMessage } from '@/lib/prospectEmail'

interface ProspectEmailEditorProps {
  email: string | null
  website?: string | null
  saving?: boolean
  disabled?: boolean
  onSave: (email: string) => void
}

export const ProspectEmailEditor = ({
  email,
  website = null,
  saving = false,
  disabled = false,
  onSave,
}: ProspectEmailEditorProps) => {
  const t = useT()
  const [value, setValue] = useState(email ?? '')

  useEffect(() => {
    setValue(email ?? '')
  }, [email])

  const prepared = prepareProspectEmailUpdate(value, website)
  const unchanged = (email ?? '').trim().toLowerCase() === value.trim().toLowerCase()
  const canSave = !disabled && !saving && !unchanged && prepared.ok
  const guardMessage = prospectEmailGuardMessage(value, website)

  const copySaved = async () => {
    if (!email) return
    try {
      await navigator.clipboard.writeText(email)
      toast.success(t('{label} kopierat', { label: t('E-post') }))
    } catch {
      toast.error(t('Kunde inte kopiera'))
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground" htmlFor="prospect-email">
        {t('Företagsmejl')}
      </label>
      <div className="flex items-center gap-2">
        <Mail className="h-3 w-3 shrink-0" />
        <Input
          id="prospect-email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('info@foretag.se')}
          disabled={disabled || saving}
          className="h-8 text-sm"
          aria-label={t('Företagsmejl')}
          data-testid="prospect-email-input"
        />
        {email && (
          <button type="button" className="text-xs underline shrink-0" onClick={copySaved} aria-label={t('Kopiera e-post')}>
            <Copy className="h-3 w-3" />
          </button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (prepared.ok) onSave(prepared.email)
          }}
          disabled={!canSave}
          data-testid="prospect-email-save"
        >
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          {email ? t('Spara e-post') : t('Lägg till e-post')}
        </Button>
      </div>
      {guardMessage ? (
        <p className="text-[10px] text-amber-700" data-testid="prospect-email-guard">
          {t(guardMessage)}
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        {t('Endast publika företagsmejl (info@, kontakt@, …). Privata adresser blockeras.')}
      </p>
    </div>
  )
}
