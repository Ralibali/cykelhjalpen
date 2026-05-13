import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  target: number
  suffix?: string
  prefix?: string
}

const CountUp = ({ target, suffix = '', prefix = '' }: CountUpProps) => {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v)}${suffix}`)
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, target, { duration: 1.5, ease: 'easeOut' })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => { controls.stop(); unsub() }
  }, [inView, target, count, rounded])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true) }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return <span ref={ref}>{display}</span>
}

const stats = [
  { target: 5, suffix: '', label: 'offerter per förfrågan (max)' },
  { target: 24, suffix: 'h', label: 'genomsnittlig svarstid' },
  { target: 100, suffix: '%', label: 'gratis för uppdragsgivare' },
]

const StatsSection = () => {
  return (
    <section className="py-16 bg-surface-alt border-y border-border">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="font-display text-5xl md:text-6xl text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <CountUp target={stat.target} suffix={stat.suffix} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StatsSection
