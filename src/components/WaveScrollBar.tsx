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
  // Track what we last set programmatically so the echo scroll event is ignored.
  // Using lastSetPx instead of a boolean flag avoids rAF race conditions where
  // rapid auto-scroll during playback keeps the flag permanently true.
  const lastSetPx       = useRef(-1)

  const innerWidth = duration * (currentPps || 1)

  useEffect(() => {
    const el = ref.current
    if (!el || currentPps <= 0) return
    const px = scrollStartTime * currentPps
    lastSetPx.current = px
    el.scrollLeft = px
  }, [scrollStartTime, currentPps])

  if (duration <= 0 || currentPps <= 0) return null

  return (
    <div
      ref={ref}
      className="tracklab-scrollbar shrink-0 overflow-x-scroll bg-zinc-950"
      style={{ height: 10 }}
      onScroll={(e) => {
        const sl = e.currentTarget.scrollLeft
        if (Math.abs(sl - lastSetPx.current) < 1) return
        onScroll(sl / currentPps)
      }}
    >
      <div style={{ width: innerWidth, height: 1 }} />
    </div>
  )
}
