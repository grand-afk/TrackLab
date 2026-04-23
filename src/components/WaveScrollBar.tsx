import { useRef, useEffect } from 'react'
import { useTrackStore } from '../store/useTrackStore'

type Props = {
  duration: number
  onScroll: (t: number) => void
}

export function WaveScrollBar({ duration, onScroll }: Props) {
  const currentPps      = useTrackStore((s) => s.currentPps)
  const scrollStartTime = useTrackStore((s) => s.scrollStartTime)
  const ref             = useRef<HTMLDivElement>(null)
  const programmatic    = useRef(false)

  const innerWidth = duration * (currentPps || 1)

  // Sync store → scrollbar position
  useEffect(() => {
    const el = ref.current
    if (!el || currentPps <= 0) return
    programmatic.current = true
    el.scrollLeft = scrollStartTime * currentPps
    requestAnimationFrame(() => { programmatic.current = false })
  }, [scrollStartTime, currentPps])

  if (duration <= 0 || currentPps <= 0) return null

  return (
    <div
      ref={ref}
      className="tracklab-scrollbar shrink-0 overflow-x-scroll bg-zinc-950"
      style={{ height: 10 }}
      onScroll={(e) => {
        if (programmatic.current) return
        onScroll(e.currentTarget.scrollLeft / currentPps)
      }}
    >
      <div style={{ width: innerWidth, height: 1 }} />
    </div>
  )
}
