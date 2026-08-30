import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import NotFound from '@/pages/NotFound'
import { useV2Flag } from '@/hooks/useV2Flag'

/**
 * Flag gate for the V2 content surface (v2.seo.content_surface, contract §5/§7
 * G-C1). While the flag is OFF the routes behave as 404 — the surface does not
 * exist publicly until HQ flips the flag after editorial review is in place.
 */
const ContentSurfaceGate = ({ children }: { children: ReactNode }) => {
  const on = useV2Flag('v2.seo.content_surface')

  if (on === null) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }
  if (!on) return <NotFound />
  return <>{children}</>
}

export default ContentSurfaceGate
