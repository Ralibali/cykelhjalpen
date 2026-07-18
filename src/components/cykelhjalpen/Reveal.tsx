import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
}

/**
 * Mjuk scroll-reveal för sektioner – spelar en gång när sektionen
 * kommer in i viewporten. Respekterar reduced motion via framer-motion.
 */
const Reveal = ({ children, delay = 0, y = 28 }: RevealProps) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
)

export default Reveal
