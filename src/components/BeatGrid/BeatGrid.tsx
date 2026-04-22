import { useMemo } from 'react'
import { useTrackStore, type BeatGridGranularity } from '../../store/useTrackStore'

type Props = {
  bpm: number
  duration: number
}

const GRANULARITY_DIVS: Record<BeatGridGranularity, number> = {
  '1': 1, '1/2': 2, '1/4': 4, '1/8': 8, '1/16': 16,
}

export function BeatGrid({ bpm, duration }: Props) {
  const granularity = useTrackStore((s) => s.granularity)
  const setGranularity = useTrackStore((s) => s.setGranularity)
  const zoomH = useTrackStore((s) => s.zoomH)
  const bpmOverride = useTrackStore((s) => s.bpmOverride)
  const setBpmOverride = useTrackStore((s) => s.setBpmOverride)

  const effectiveBpm = bpmOverride ?? bpm

  const beats = useMemo(() => {
    if (!effectiveBpm || !duration) return []
    const beatDuration = 60 / effectiveBpm
    const div = GRANULARITY_DIVS[granularity]
    const interval = beatDuration / div
    const total = Math.floor(duration / interval)
    const result = []
    for (let i = 0; i <= total; i++) {
      result.push({ time: i * interval, beatIndex: i, isBeat: i % div === 0 })
    }
    return result
  }, [effectiveBpm, duration, granularity])

  const GRANULARITIES: BeatGridGranularity[] = ['1', '1/2', '1/4', '1/8', '1/16']

  return (
    <div className="flex flex-col gap-1 px-2 py-2 bg-zinc-950 border-b border-zinc-800">
      {/* Controls row */}
      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-1">
        <span className="font-mono font-semibold text-zinc-200">
          {effectiveBpm.toFixed(1)} BPM
        </span>
        <input
          type="number"
          value={bpmOverride ?? ''}
          onChange={(e) => setBpmOverride(e.target.value ? Number(e.target.value) : null)}
          placeholder="Override BPM"
          className="w-28 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-1 ml-auto">
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Beat ruler */}
      <div className="relative h-6 overflow-hidden" style={{ minWidth: 0 }}>
        <div
          className="relative h-full"
          style={{ width: `${zoomH * 100}%` }}
        >
          {beats.map(({ time, beatIndex, isBeat }) => {
            const pct = (time / duration) * 100
            return (
              <div
                key={beatIndex}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${pct}%` }}
              >
                <div className={`w-px ${isBeat ? 'h-4 bg-zinc-400' : 'h-2 bg-zinc-700'}`} />
                {isBeat && (
                  <span className="text-[9px] text-zinc-500 font-mono leading-none mt-0.5">
                    {Math.floor(beatIndex / GRANULARITY_DIVS[granularity]) + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
