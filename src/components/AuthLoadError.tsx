import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

export default function AuthLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT()
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-5 space-y-3">
      <p>{t(message)}</p>
      <Button type="button" onClick={onRetry}>{t('Försök igen')}</Button>
      <a href="mailto:info@auroramedia.se" className="block text-sm underline">
        {t('Behöver du hjälp? Kontakta oss')}
      </a>
    </div>
  )
}
