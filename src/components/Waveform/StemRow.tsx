import { useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Volume2, VolumeX, Headphones, X, Loader2 } from 'lucide-react'
import { Waveform } from './Waveform'
import { Spectrogram } from '../Spectrogram/Spectrogram'
import { BeatGrid } from '../BeatGrid/BeatGrid'
import { CueMarkers } from '../Markers/CueMarkers'
import { ErrorBoundary } from '../ErrorBoundary'
import { useTrackStore, type Stem, STEM_LETTERS } from '../../store/useTrackStore'
import { cn } from '../../lib/utils'

type Props = {
  stem: Stem
  stemIndex: number
  audioBuffer: AudioBuffer | null
  wsRef: React.MutableRefObject<WaveSurfer | null>
  isFirst: boolean
  onSeek: (t: number) => void
}

export function StemRow({ stem, stemIndex, audioBuffer, wsRef, isFirst, onSeek }: Props) {
  const [showSpec, setShowSpec] = useState(true)
  const [showWave, setShowWave] = useState(true)
  const updateStem       = useTrackStore((s) => s.updateStem)
  const removeStem       = useTrackStore((s) => s.removeStem)
  const bpmOverride      = useTrackStore((s) => s.bpmOverride)
  const focusedStemId    = useTrackStore((s) => s.focusedStemId)
  const setFocusedStemId = useTrackStore((s) => s.setFocusedStemId)
  const totalStems       = useTrackStore((s) => s.stems.length)
  const isFocused        = focusedStemId === stem.id
  const letter           = STEM_LETTERS[stemIndex] ?? '?'

  const effectiveBpm = bpmOverride ?? stem.bpm ?? 0

  return (
    <div
      className="border-b border-zinc-800 last:border-0"
      onClick={() => setFocusedStemId(stem.id)}
    >
      {/* Stem header — sticky so it stays visible when scrolling */}
      <div
        className={`sticky top-0 z-10 flex items-center gap-3 px-3 py-1.5 bg-zinc-900 transition-colors ${isFocused ? 'bg-zinc-800/80' : ''}`}
        style={{ borderLeft: `${isFocused ? 4 : 3}px solid ${stem.color}${isFocused ? '' : '99'}` }}
      >
        {totalStems >= 2 && (
          <span
            className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-zinc-900 shrink-0 select-none"
            style={{ backgroundColor: stem.color }}
          >
            {letter}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{stem.name}</p>
          <p className="text-xs text-zinc-500 font-mono flex items-center gap-2">
            {!audioBuffer && (
              <span className="flex items-center gap-1 text-indigo-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Decoding…
              </span>
            )}
            {audioBuffer && stem.bpm === null && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
              </span>
            )}
            {stem.bpm != null && `${stem.bpm} BPM`}
            {stem.key  != null && ` · ${stem.key} ${stem.scale ?? ''}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => updateStem(stem.id, { muted: !stem.muted })}
            className={cn('p-1.5 rounded transition-colors',
              stem.muted ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-200'
            )}
            title={stem.muted ? 'Unmute' : 'Mute'}
          >
            {stem.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => updateStem(stem.id, { solo: !stem.solo })}
            className={cn('p-1.5 rounded transition-colors',
              stem.solo ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-200'
            )}
            title="Solo"
          >
            <Headphones className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowWave((v) => !v) }}
            className={cn('px-2 py-0.5 rounded text-xs font-mono transition-colors',
              showWave ? 'bg-indigo-600/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800'
            )}
          >
            WAVE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSpec((v) => !v) }}
            className={cn('px-2 py-0.5 rounded text-xs font-mono transition-colors',
              showSpec ? 'bg-indigo-600/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800'
            )}
          >
            SPEC
          </button>
          <button
            onClick={() => removeStem(stem.id)}
            className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Beat grid (only on first stem, only when BPM + duration known) */}
      {isFirst && effectiveBpm > 0 && stem.duration > 0 && (
        <BeatGrid bpm={effectiveBpm} duration={stem.duration} onSeek={onSeek} />
      )}

      {/* Waveform + marker overlay — keep mounted when hidden so WaveSurfer doesn't reinitialise */}
      <ErrorBoundary fallback={(e) => (
        <div className="px-3 py-2 text-xs text-red-400 font-mono">Waveform error: {e.message}</div>
      )}>
        <div className={showWave ? 'relative' : 'relative hidden'}>
          <Waveform stem={stem} audioBuffer={audioBuffer} wsRef={wsRef} isFirst={isFirst} />
          {stem.duration > 0 && <CueMarkers duration={stem.duration} stemId={stem.id} />}
        </div>
      </ErrorBoundary>

      {/* Spectrogram */}
      {showSpec && audioBuffer && (
        <ErrorBoundary fallback={(e) => (
          <div className="px-3 py-2 text-xs text-red-400 font-mono">Spectrogram error: {e.message}</div>
        )}>
          <div className="px-2 pb-2">
            <Spectrogram audioBuffer={audioBuffer} height={120} />
          </div>
        </ErrorBoundary>
      )}
      {showSpec && !audioBuffer && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Waiting for decode…
        </div>
      )}
    </div>
  )
}
