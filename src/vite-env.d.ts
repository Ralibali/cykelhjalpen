/// <reference types="vite/client" />

declare module 'virtual:seo-route-manifest' {
  const manifest: {
    noindexPaths: Record<'cykelhjalpen' | 'updro', string[]>
    comparisonSlugs: string[]
  }
  export default manifest
}
