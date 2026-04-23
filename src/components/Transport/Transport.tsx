import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Square, SkipBack, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (seconds: number) => void
  onSkip: (fine: boolean, direction: 1 | -1) => void
  duration: number
  onAddFile: () => void
}

// ── Split time input ──────────────────────────────────────────────────────
function TimeInput({ value, duration, onCommit, onCancel }: {
  value: number
  duration: number
  onCommit: (t: number) => void
  onCancel: () => void
}) {
  const [mins, setMins] = useState(Math.floor(value / 60))
  const [secs, setSecs] = useState(Math.floor(value % 60))
  const [ds,   setDs]   = useState(Math.floor((value % 1) * 10))   // tenths

  const mRef = useRef<HTMLInputElement>(null)
  const sRef = useRef<HTMLInputElement>(null)
  const dRef = useRef<HTMLInputElement>(null)

  useEffect(() => { mRef.current?.focus(); mRef.current?.select() }, [])

  function commit() {
    const t = Math.max(0, Math.min(duration, mins * 60 + secs + ds / 10))
    onCommit(t)
  }

  const sharedKeys = (e: React.KeyboardEvent, next?: () => void) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    if (e.key === 'Tab' && next) { e.preventDefault(); next() }
  }

  const cls = 'bg-transparent text-zinc-100 font-mono text-sm focus:outline-none text-center'

  return (
    <div className="flex items-center border border-indigo-500 rounded px-1.5 py-0.5 bg-zinc-800 gap-0">
      <input ref={mRef} type="number" min={0} value={mins}
        onChange={(e) => setMins(Math.max(0, parseInt(e.target.value) || 0))}
        onKeyDown={(e) => sharedKeys(e, () => { sRef.current?.focus(); sRef.current?.select() })}
        className={`${cls} w-6`} />
      <span className="text-zinc-500 font-mono text-sm select-none">:</span>
      <input ref={sRef} type="number" min={0} max={59} value={String(secs).padStart(2,'0')}
        onChange={(e) => setSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
        onKeyDown={(e) => {
          sharedKeys(e, () => { dRef.current?.focus(); dRef.current?.select() })
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); mRef.current?.focus(); mRef.current?.select() }
        }}
        className={`${cls} w-8`} />
      <span className="text-zinc-500 font-mono text-sm select-none">.</span>
      <input ref={dRef} type="number" min={0} max={9} value={ds}
        onChange={(e) => setDs(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
        onKeyDown={(e) => {
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); commit() }
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); sRef.current?.focus(); sRef.current?.select() }
          sharedKeys(e)
        }}
        className={`${cls} w-5`} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function Transport({ onPlay, onPause, onStop, onSeek, onSkip, duration, onAddFile }: Props) {
  const isPlaying     = useTrackStore((s) => s.isPlaying)
  const playheadTime  = useTrackStore((s) => s.playheadTime)
  const skip          = useTrackStore((s) => s.settings.skip)
  const [editing, setEditing] = useState(false)

  // G shortcut → open time input
  useEffect(() => {
    const handler = () => setEditing(true)
    window.addEventListener('tracklab:goto', handler)
    return () => window.removeEventListener('tracklab:goto', handler)
  }, [])

  function fmtTime(s: number) {
    const m  = Math.floor(s / 60)
    const ss = Math.floor(s % 60).toString().padStart(2, '0')
    const d  = Math.floor((s % 1) * 10)
    return `${m}:${ss}.${d}`
  }

  const skipLabel = useCallback((fine: boolean) => {
    const amt = fine ? skip.fineAmount : skip.amount
    const unit = fine ? skip.fineUnit : skip.unit
    return `${amt}${unit === 'beats' ? 'b' : 's'}`
  }, [skip])

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 flex-wrap gap-y-1.5">
      {/* Skip to start */}
      <button onClick={() => onSeek(0)}
        className="flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        title="Skip to start (Home)">
        <SkipBack className="w-3.5 h-3.5" />
      </button>

      {/* Skip back */}
      <button onClick={() => onSkip(false, -1)}
        className="flex items-center justify-center h-7 px-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors gap-0.5 text-[10px] font-mono"
        title={`Back ${skipLabel(false)} (← / Shift← for ${skipLabel(true)})`}>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-zinc-600">{skipLabel(false)}</span>
      </button>

      {/* Play / Pause */}
      <button onClick={isPlaying ? onPause : onPlay}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      {/* Stop */}
      <button onClick={onStop}
        className="flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        title="Stop (Esc)">
        <Square className="w-3.5 h-3.5" />
      </button>

      {/* Skip forward */}
      <button onClick={() => onSkip(false, 1)}
        className="flex items-center justify-center h-7 px-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors gap-0.5 text-[10px] font-mono"
        title={`Forward ${skipLabel(false)} (→ / Shift→ for ${skipLabel(true)})`}>
        <span className="text-zinc-600">{skipLabel(false)}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Time display / editor */}
      <div className="flex items-center gap-2 ml-1">
        {editing ? (
          <TimeInput
            value={playheadTime}
            duration={duration}
            onCommit={(t) => { onSeek(t); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-mono text-sm text-zinc-200 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors tabular-nums"
            title="Go to time (G)">
            {fmtTime(playheadTime)}
          </button>
        )}
        <span className="text-zinc-600 text-xs font-mono tabular-nums">/ {fmtTime(duration)}</span>
      </div>

      {/* Add stem */}
      <button onClick={onAddFile}
        className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition-colors"
        title="Add stem">
        <Plus className="w-3.5 h-3.5" /> Add stem
      </button>
    </div>
  )
}
