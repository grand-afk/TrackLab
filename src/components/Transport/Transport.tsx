import { useRef, useState, useCallback, useEffect } from 'react'
import { Play, Pause, Square, SkipBack, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (seconds: number) => void
  duration: number
  onAddFile: () => void
}

function parseTime(str: string): number | null {
  // Accepts: 1:23.4  |  83.4  |  1:23
  const mms = str.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/)
  if (mms) return parseInt(mms[1]) * 60 + parseFloat(`${mms[2]}.${mms[3] ?? '0'}`)
  const secs = parseFloat(str)
  return isNaN(secs) ? null : secs
}

function formatDisplay(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  const ms = Math.floor((s % 1) * 10)
  return `${m}:${sec}.${ms}`
}

export function Transport({ onPlay, onPause, onStop, onSeek, duration, onAddFile }: Props) {
  const isPlaying = useTrackStore((s) => s.isPlaying)
  const playheadTime = useTrackStore((s) => s.playheadTime)

  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // G shortcut focuses the position input — called from App via a custom event
  useEffect(() => {
    const handler = () => {
      setEditing(true)
      setInputVal(formatDisplay(playheadTime))
      setTimeout(() => inputRef.current?.select(), 0)
    }
    window.addEventListener('tracklab:goto', handler)
    return () => window.removeEventListener('tracklab:goto', handler)
  }, [playheadTime])

  const commitEdit = useCallback(() => {
    const t = parseTime(inputVal)
    if (t !== null && duration > 0) onSeek(Math.max(0, Math.min(t, duration)))
    setEditing(false)
  }, [inputVal, duration, onSeek])

  const SKIP = 5

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 flex-wrap gap-y-2">
      {/* Transport buttons */}
      <div className="flex items-center gap-1">
        {/* Skip to start */}
        <button
          onClick={() => onSeek(0)}
          className="flex items-center justify-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Skip to start (Home)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Skip back 5s */}
        <button
          onClick={() => onSeek(Math.max(0, playheadTime - SKIP))}
          className="flex items-center justify-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Back 5s"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          className="flex items-center justify-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Stop (Esc)"
        >
          <Square className="w-3.5 h-3.5" />
        </button>

        {/* Skip forward 5s */}
        <button
          onClick={() => onSeek(Math.min(duration, playheadTime + SKIP))}
          className="flex items-center justify-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Forward 5s"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Position display / input */}
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-24 bg-zinc-800 border border-indigo-500 rounded px-2 py-1 text-sm font-mono text-zinc-100 focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditing(true); setInputVal(formatDisplay(playheadTime)) }}
            className="w-24 text-left px-2 py-1 font-mono text-sm text-zinc-200 hover:text-white hover:bg-zinc-800 rounded transition-colors tabular-nums"
            title="Click or press G to jump to time"
          >
            {formatDisplay(playheadTime)}
          </button>
        )}
        <span className="text-zinc-600 text-xs font-mono tabular-nums">
          / {formatDisplay(duration)}
        </span>
      </div>

      {/* Add stem button — compact */}
      <button
        onClick={onAddFile}
        className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors"
        title="Add stem"
      >
        <Plus className="w-3.5 h-3.5" /> Add stem
      </button>
    </div>
  )
}
