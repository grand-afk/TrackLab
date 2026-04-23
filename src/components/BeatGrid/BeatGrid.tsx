import { useMemo } from 'react'
import { useTrackStore, type BeatGridGranularity } from '../../store/useTrackStore'

type Props = { bpm: number; duration: number; onSeek?: (t: number) => void }

// '1' granularity = 1 full bar; denominator note and numerator come from settings
const DIVS: Record<BeatGridGranularity, number> = {
  '1': 1, '1/2': 2, '1/4': 4, '1/8': 8, '1/16': 16,
}
const GRANULARITIES: BeatGridGranularity[] = ['1', '1/2', '1/4', '1/8', '1/16']

export function BeatGrid({ bpm, duration, onSeek }: Props) {
  const granularity    = useTrackStore((s) => s.granularity)
  const setGranularity = useTrackStore((s) => s.setGranularity)
  const bpmOverride    = useTrackStore((s) => s.bpmOverride)
  const setBpmOverride = useTrackStore((s) => s.setBpmOverride)
  const currentPps     = useTrackStore((s) => s.currentPps)
  const scrollStart    = useTrackStore((s) => s.scrollStartTime)
  const containerW     = useTrackStore((s) => s.containerWidth)
  const timeSigTop     = useTrackStore((s) => s.settings.timeSignatureTop)
  const timeSigBot     = useTrackStore((s) => s.settings.timeSignatureBottom)

  const effectiveBpm    = bpmOverride ?? bpm
  const BEATS_PER_BAR   = timeSigTop
  const NOTE_MULTIPLIER = 4 / timeSigBot  // multiplier vs quarter note

  // Only render marks within the visible window
  const visibleEnd = scrollStart + (containerW / (currentPps || 1))

  const marks = useMemo(() => {
    if (!effectiveBpm || !duration || !currentPps) return []
    const div = DIVS[granularity]
    // interval: each grid line = (BEATS_PER_BAR / div) denominator notes
    const noteDuration = (60 / effectiveBpm) * NOTE_MULTIPLIER  // one denominator note in seconds
    const interval = noteDuration * (BEATS_PER_BAR / div)  // seconds per mark
    const first = Math.max(0, Math.floor(scrollStart / interval) - 1)
    const last  = Math.min(Math.ceil(duration / interval) + 1, Math.ceil(visibleEnd / interval) + 1)
    // Min px between bar number labels (avoid crowding)
    const labelEvery = Math.max(1, Math.ceil(20 / (interval * currentPps)))
    const result = []
    for (let i = first; i <= last; i++) {
      const t = i * interval
      if (t > duration) break
      const isBar = i % div === 0
      const barNum = Math.floor(i / div) + 1
      result.push({
        t,
        isBar,
        barNum,
        showLabel: isBar && barNum % labelEvery === 0,
      })
    }
    return result
  }, [effectiveBpm, duration, currentPps, granularity, scrollStart, visibleEnd])

  return (
    <div className="bg-zinc-950 border-b border-zinc-800">
      {/* Controls row */}
      <div className="flex items-center gap-3 px-3 pt-2 pb-1">
        <span className="font-mono text-xs font-bold text-zinc-100">
          {effectiveBpm.toFixed(1)} BPM
        </span>
        <input
          type="number"
          value={bpmOverride ?? ''}
          onChange={(e) => setBpmOverride(e.target.value ? Number(e.target.value) : null)}
          placeholder="Override…"
          className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-zinc-600 mr-1">Grid</span>
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Beat ruler — synced to WaveSurfer scroll+zoom via store */}
      <div className="relative h-9 overflow-hidden" style={{ minWidth: 0 }}>
        {currentPps > 0 && marks.map(({ t, isBar, barNum, showLabel }) => {
          const left = (t - scrollStart) * currentPps
          if (left < -20 || left > containerW + 20) return null
          return (
            <div
              key={t}
              className={`absolute top-0 flex flex-col items-center${onSeek ? ' cursor-pointer' : ''}`}
              style={{ left }}
              onClick={() => onSeek?.(t)}
            >
              {isBar ? (
                <>
                  <div className="w-px bg-zinc-500" style={{ height: showLabel ? 22 : 14 }} />
                  {showLabel && (
                    <span className="text-[10px] text-zinc-400 font-mono leading-none mt-0.5">
                      {barNum}
                    </span>
                  )}
                </>
              ) : (
                <div className="w-px bg-zinc-700" style={{ height: 10, marginTop: 4 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
