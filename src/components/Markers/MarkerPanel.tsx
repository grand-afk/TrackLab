import { useRef, useCallback } from 'react'
import { Trash2, MapPin } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = {
  duration: number
  onSeek: (t: number) => void
  onClearAll: () => void
  editingId: string | null
  setEditingId: (id: string | null) => void
}

function pad(n: number, len = 2) { return String(Math.floor(n)).padStart(len, '0') }
function fmtTime(s: number) {
  return `${pad(s / 60)}:${pad(s % 60)}.${Math.floor((s % 1) * 10)}`
}

export function MarkerPanel({ onSeek, onClearAll, setEditingId }: Props) {
  const cueMarkers        = useTrackStore((s) => s.cueMarkers)
  const selectedMarkerId  = useTrackStore((s) => s.selectedMarkerId)
  const setSelectedMarkerId = useTrackStore((s) => s.setSelectedMarkerId)
  const updateCueMarker   = useTrackStore((s) => s.updateCueMarker)
  const removeCueMarker   = useTrackStore((s) => s.removeCueMarker)

  // Refs for each label input so we can focus programmatically
  const labelRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const focusLabel = useCallback((id: string) => {
    setSelectedMarkerId(id)
    setEditingId(id)
    setTimeout(() => labelRefs.current.get(id)?.focus(), 30)
  }, [setSelectedMarkerId, setEditingId])

  // Expose focusLabel via custom event so App.tsx can call it for F2
  if (typeof window !== 'undefined') {
    (window as Window & { __tlFocusLabel?: (id: string) => void }).__tlFocusLabel = focusLabel
  }

  if (cueMarkers.length === 0) return null

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <MapPin className="w-3 h-3" />
          <span>Markers</span>
          <span className="text-zinc-700">({cueMarkers.length})</span>
        </div>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors"
          title="Clear all markers"
        >
          <Trash2 className="w-3 h-3" /> Clear all
        </button>
      </div>

      {/* Marker list */}
      <div className="divide-y divide-zinc-900">
        {cueMarkers.map((marker, idx) => {
          const isSelected = marker.id === selectedMarkerId
          return (
            <div
              key={marker.id}
              className={`flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer ${
                isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/50'
              }`}
              onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
            >
              {/* Colour badge with number */}
              <div
                className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-zinc-900 shrink-0"
                style={{ backgroundColor: marker.color }}
              >
                {marker.number === 10 ? 0 : marker.number > 10 ? marker.number - 10 : marker.number}
                {marker.number > 10 && <span className="text-[7px] leading-none ml-0.5">A</span>}
              </div>

              {/* Timecode — click to seek */}
              <button
                className="font-mono text-xs text-zinc-400 hover:text-indigo-400 transition-colors tabular-nums shrink-0 w-16 text-left"
                onClick={(e) => { e.stopPropagation(); onSeek(marker.time) }}
                title="Seek to marker (Ctrl+number)"
              >
                {fmtTime(marker.time)}
              </button>

              {/* Label input — always visible, full width */}
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
                    const next = e.shiftKey ? cueMarkers[idx - 1] : cueMarkers[idx + 1]
                    if (next) focusLabel(next.id)
                    else e.currentTarget.blur()
                  }
                }}
                className="flex-1 bg-transparent border-b border-zinc-800 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 py-0.5 min-w-0 transition-colors"
              />

              {/* Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); removeCueMarker(marker.id); if (isSelected) setSelectedMarkerId(null) }}
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
}
