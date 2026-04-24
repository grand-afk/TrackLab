import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Square, SkipBack, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { useTrackStore, fmtHHMMSS, fmtBarsBeats } from '../../store/useTrackStore'
import { ShortcutBadge } from '../Shortcuts/ShortcutBadge'

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

type Props = {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (seconds: number) => void
  onSkip: (fine: boolean, direction: 1 | -1) => void
  duration: number
  onAddFile: () => void
}

// ── HH:MM:SS time input ───────────────────────────────────────────────────
function TimeInput({ value, duration, onCommit, onCancel }: {
  value: number
  duration: number
  onCommit: (t: number) => void
  onCancel: () => void
}) {
  const [hours, setHours] = useState(Math.floor(value / 3600))
  const [mins,  setMins]  = useState(Math.floor((value % 3600) / 60))
  const [secs,  setSecs]  = useState(Math.floor(value % 60))

  const hRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)
  const sRef = useRef<HTMLInputElement>(null)

  useEffect(() => { hRef.current?.focus(); hRef.current?.select() }, [])

  function commit() {
    const t = Math.max(0, Math.min(duration, hours * 3600 + mins * 60 + secs))
    onCommit(t)
  }

  const sharedKeys = (e: React.KeyboardEvent, next?: () => void) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    if (e.key === 'Tab' && !e.shiftKey && next) { e.preventDefault(); next() }
  }

  const cls = 'bg-transparent text-zinc-100 font-mono text-sm focus:outline-none text-center'

  return (
    <div className="flex items-center border border-indigo-500 rounded px-1.5 py-0.5 bg-zinc-800 gap-0">
      <input ref={hRef} type="number" min={0} value={hours}
        onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
        onKeyDown={(e) => sharedKeys(e, () => { mRef.current?.focus(); mRef.current?.select() })}
        className={`${cls} w-6`} />
      <span className="text-zinc-500 font-mono text-sm select-none">:</span>
      <input ref={mRef} type="number" min={0} max={59} value={String(mins).padStart(2,'0')}
        onChange={(e) => setMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
        onKeyDown={(e) => {
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); hRef.current?.focus(); hRef.current?.select() }
          sharedKeys(e, () => { sRef.current?.focus(); sRef.current?.select() })
        }}
        className={`${cls} w-8`} />
      <span className="text-zinc-500 font-mono text-sm select-none">:</span>
      <input ref={sRef} type="number" min={0} max={59} value={String(secs).padStart(2,'0')}
        onChange={(e) => setSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
        onKeyDown={(e) => {
          if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); mRef.current?.focus(); mRef.current?.select() }
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); commit() }
          sharedKeys(e)
        }}
        className={`${cls} w-8`} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function Transport({ onPlay, onPause, onStop, onSeek, onSkip, duration, onAddFile }: Props) {
  const isPlaying      = useTrackStore((s) => s.isPlaying)
  const playheadTime   = useTrackStore((s) => s.playheadTime)
  const skip           = useTrackStore((s) => s.settings.skip)
  const timeSigTop     = useTrackStore((s) => s.settings.timeSignatureTop)
  const timeSigBot     = useTrackStore((s) => s.settings.timeSignatureBottom)
  const subdivTicks    = useTrackStore((s) => s.settings.subdivisionTicks)
  const stems          = useTrackStore((s) => s.stems)
  const bpmOverride    = useTrackStore((s) => s.bpmOverride)
  const loopEnabled    = useTrackStore((s) => s.loopEnabled)
  const loopStart      = useTrackStore((s) => s.loopStart)
  const loopEnd        = useTrackStore((s) => s.loopEnd)
  const toggleLoop     = useTrackStore((s) => s.toggleLoop)
  const setLoopRegion  = useTrackStore((s) => s.setLoopRegion)
  const cueMarkers     = useTrackStore((s) => s.cueMarkers)
  const focusedStemId  = useTrackStore((s) => s.focusedStemId)

  const [editing, setEditing] = useState(false)

  // Resolve BPM for bars display (first stem with known BPM or override)
  const bpm = bpmOverride ?? stems.find((s) => s.bpm != null)?.bpm ?? 0

  // G shortcut → open time input
  useEffect(() => {
    const handler = () => setEditing(true)
    window.addEventListener('tracklab:goto', handler)
    return () => window.removeEventListener('tracklab:goto', handler)
  }, [])

  const skipLabel = useCallback((fine: boolean) => {
    const amt  = fine ? skip.fineAmount : skip.amount
    const unit = fine ? skip.fineUnit   : skip.unit
    return `${amt}${unit === 'beats' ? 'b' : 's'}`
  }, [skip])

  const focusedMarkers = cueMarkers
    .filter((m) => m.stemId === focusedStemId)
    .sort((a, b) => a.time - b.time)

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 flex-wrap gap-y-1.5">
      {/* Skip to start */}
      <button onClick={() => onSeek(0)}
        className="relative flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        title="Skip to start (Home)">
        <SkipBack className="w-3.5 h-3.5" />
        <ShortcutBadge action="skip-start" />
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
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        <ShortcutBadge action="play-pause" />
      </button>

      {/* Stop */}
      <button onClick={onStop}
        className="relative flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        title="Stop (Esc)">
        <Square className="w-3.5 h-3.5" />
        <ShortcutBadge action="stop" />
      </button>

      {/* Loop toggle (only when a loop region is set) */}
      {loopStart !== null && loopEnd !== null && (
        <button
          onClick={toggleLoop}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded transition-colors',
            loopEnabled
              ? 'text-indigo-400 bg-indigo-500/20'
              : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800'
          )}
          title={loopEnabled ? 'Loop: ON (click to disable)' : 'Loop: OFF (click to enable)'}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Set Loop from first+last marker of focused stem */}
      {focusedMarkers.length >= 2 && (
        <button
          onClick={() => setLoopRegion(focusedMarkers[0].time, focusedMarkers[focusedMarkers.length - 1].time)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          title="Set loop between first and last marker"
        >
          <Repeat className="w-3 h-3" /> Loop
        </button>
      )}

      {/* Skip forward */}
      <button onClick={() => onSkip(false, 1)}
        className="flex items-center justify-center h-7 px-1.5 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors gap-0.5 text-[10px] font-mono"
        title={`Forward ${skipLabel(false)} (→ / Shift→ for ${skipLabel(true)})`}>
        <span className="text-zinc-600">{skipLabel(false)}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Time display / editor */}
      <div className="flex items-center gap-3 ml-1">
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
            className="relative flex flex-col items-start font-mono text-sm hover:bg-zinc-800 rounded px-1.5 py-0.5 transition-colors"
            title="Go to time (G)">
            <span className="text-zinc-200 tabular-nums leading-tight">{fmtHHMMSS(playheadTime)}</span>
            {bpm > 0 && (
              <span className="text-[10px] text-zinc-500 tabular-nums leading-tight">
                {fmtBarsBeats(playheadTime, bpm, timeSigTop, timeSigBot, subdivTicks)}
              </span>
            )}
            <ShortcutBadge action="goto" className="bottom-0 right-0 top-auto" />
          </button>
        )}
        <div className="flex flex-col items-start">
          <span className="text-zinc-600 text-xs font-mono tabular-nums leading-tight">/ {fmtHHMMSS(duration)}</span>
          {bpm > 0 && (
            <span className="text-[10px] text-zinc-700 font-mono tabular-nums leading-tight">
              / {fmtBarsBeats(duration, bpm, timeSigTop, timeSigBot, subdivTicks)}
            </span>
          )}
        </div>
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
