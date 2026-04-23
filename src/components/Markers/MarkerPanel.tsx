import { useRef, useCallback } from 'react'
import { Trash2, MapPin } from 'lucide-react'
import { useTrackStore, fmtHHMMSS, STEM_LETTERS } from '../../store/useTrackStore'

type Props = {
  onSeek: (t: number) => void
  onClearStem: (stemId: string) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
}

export function MarkerPanel({ onSeek, onClearStem, setEditingId }: Props) {
  const stems             = useTrackStore((s) => s.stems)
  const allMarkers        = useTrackStore((s) => s.cueMarkers)
  const focusedStemId     = useTrackStore((s) => s.focusedStemId)
  const setFocusedStemId  = useTrackStore((s) => s.setFocusedStemId)
  const selectedMarkerId  = useTrackStore((s) => s.selectedMarkerId)
  const setSelectedMarkerId = useTrackStore((s) => s.setSelectedMarkerId)
  const updateCueMarker   = useTrackStore((s) => s.updateCueMarker)
  const removeCueMarker   = useTrackStore((s) => s.removeCueMarker)

  const labelRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const focusLabel = useCallback((id: string) => {
    setSelectedMarkerId(id)
    setEditingId(id)
    setTimeout(() => labelRefs.current.get(id)?.focus(), 30)
  }, [setSelectedMarkerId, setEditingId])

  if (typeof window !== 'undefined') {
    (window as Window & { __tlFocusLabel?: (id: string) => void }).__tlFocusLabel = focusLabel
  }

  const stemsWithMarkers = stems.filter((stem) => allMarkers.some((m) => m.stemId === stem.id))
  if (stemsWithMarkers.length === 0) return null

  const multiStem = stems.length >= 2

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      {stemsWithMarkers.map((stem) => {
        const stemIndex   = stems.indexOf(stem)
        const letter      = STEM_LETTERS[stemIndex] ?? '?'
        const stemMarkers = allMarkers.filter((m) => m.stemId === stem.id)
        const isFocused   = focusedStemId === stem.id

        return (
          <div key={stem.id}>
            {/* Stem group header */}
            <div
              className={`flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 cursor-pointer transition-colors select-none ${
                isFocused ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/40'
              }`}
              style={{ borderLeft: `3px solid ${stem.color}` }}
              onClick={() => setFocusedStemId(stem.id)}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {multiStem ? (
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold text-zinc-900 shrink-0"
                    style={{ backgroundColor: stem.color }}
                  >
                    {letter}
                  </span>
                ) : (
                  <MapPin className="w-3 h-3 text-zinc-500" />
                )}
                <span className="font-medium" style={{ color: stem.color }}>{stem.name}</span>
                <span className="text-zinc-600">({stemMarkers.length})</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onClearStem(stem.id) }}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors"
                title="Clear markers for this stem (Ctrl+Shift+M)"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Marker rows */}
            <div className="divide-y divide-zinc-900">
              {stemMarkers.map((marker, idx) => {
                const isSelected = marker.id === selectedMarkerId
                return (
                  <div
                    key={marker.id}
                    className={`flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/50'
                    }`}
                    style={{ borderLeft: `2px solid ${stem.color}40` }}
                    onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
                  >
                    {/* Number badge */}
                    <div
                      className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-zinc-900 shrink-0"
                      style={{ backgroundColor: marker.color }}
                    >
                      {marker.number === 10 ? 0 : marker.number > 10 ? marker.number - 10 : marker.number}
                      {marker.number > 10 && <span className="text-[7px] leading-none ml-0.5">A</span>}
                    </div>

                    {/* Timecode */}
                    <button
                      className="font-mono text-xs text-zinc-400 hover:text-indigo-400 transition-colors tabular-nums shrink-0 w-20 text-left"
                      onClick={(e) => { e.stopPropagation(); onSeek(marker.time) }}
                      title="Seek to marker"
                    >
                      {fmtHHMMSS(marker.time)}
                    </button>

                    {/* Label input */}
                    <input
                      ref={(el) => { if (el) labelRefs.current.set(marker.id, el); else labelRefs.current.delete(marker.id) }}
                      type="text"
                      value={marker.label}
                      placeholder={`Marker ${marker.number > 10 ? `Alt+${marker.number - 10}` : marker.number}`}
                      onChange={(e) => updateCueMarker(marker.id, { label: e.target.value })}
                      onFocus={() => { setSelectedMarkerId(marker.id); setEditingId(marker.id) }}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Escape') { e.currentTarget.blur(); setEditingId(null) }
                        if (e.key === 'Tab') {
                          e.preventDefault()
                          const next = e.shiftKey ? stemMarkers[idx - 1] : stemMarkers[idx + 1]
                          if (next) focusLabel(next.id)
                          else e.currentTarget.blur()
                        }
                      }}
                      className="flex-1 bg-transparent border-b border-zinc-800 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 py-0.5 min-w-0 transition-colors"
                    />

                    {/* Remove */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCueMarker(marker.id)
                        if (isSelected) setSelectedMarkerId(null)
                      }}
                      className="shrink-0 text-zinc-700 hover:text-red-400 transition-colors ml-1"
                      title="Remove marker"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
