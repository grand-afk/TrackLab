import { Play, Pause, Square } from 'lucide-react'
import { cn } from '../../lib/utils'
import { formatTime } from '../../lib/utils'
import { useTrackStore } from '../../store/useTrackStore'

type Props = {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  duration: number
}

export function Transport({ onPlay, onPause, onStop, duration }: Props) {
  const isPlaying = useTrackStore((s) => s.isPlaying)
  const playheadTime = useTrackStore((s) => s.playheadTime)

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-1">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
            'bg-indigo-600 hover:bg-indigo-500 text-white'
          )}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={onStop}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title="Stop (Esc)"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      <div className="font-mono text-sm text-zinc-300 tabular-nums min-w-[5rem]">
        {formatTime(playheadTime)}
      </div>
      <div className="text-zinc-600 text-xs font-mono">
        / {formatTime(duration)}
      </div>
    </div>
  )
}
