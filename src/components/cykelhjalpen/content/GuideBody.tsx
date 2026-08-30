import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { headingAnchorId } from '@/lib/v2/content'

interface Block {
  kind: 'h2' | 'h3' | 'markdown'
  text?: string
  id?: string
  raw: string
}

/**
 * Renderer for v2_content_pages.body_markdown. Delegates paragraphs, lists
 * and tables to the shared renderMarkdown and adds ## / ### headings with
 * stable anchor ids (for the article TOC). Swedish text only — the content
 * surface is sv-SE.
 */
const GuideBody = ({ markdown }: { markdown: string }) => {
  const blocks = useMemo<Block[]>(() => {
    const usedIds = new Set<string>()
    return markdown
      .split('\n\n')
      .map((b) => b.trim())
      .filter(Boolean)
      .map((raw) => {
        const heading = raw.match(/^(#{2,3})\s+(.+?)\s*$/)
        if (!heading) return { kind: 'markdown', raw }
        const text = heading[2].replace(/\*\*/g, '')
        return {
          kind: heading[1].length === 2 ? 'h2' : 'h3',
          text,
          id: headingAnchorId(text, usedIds),
          raw,
        }
      })
  }, [markdown])

  return (
    <div className="text-foreground/90">
      {blocks.map((block, i) => {
        if (block.kind === 'h2') {
          return (
            <h2 key={i} id={block.id} className="font-display text-2xl font-bold mt-10 mb-3 scroll-mt-24">
              {block.text}
            </h2>
          )
        }
        if (block.kind === 'h3') {
          return (
            <h3 key={i} id={block.id} className="font-display text-xl font-semibold mt-8 mb-2 scroll-mt-24">
              {block.text}
            </h3>
          )
        }
        return <div key={i}>{renderMarkdown(block.raw)}</div>
      })}
    </div>
  )
}

export default GuideBody
