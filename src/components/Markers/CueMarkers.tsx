import { useState } from 'react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = {
  duration: number
  stemId: string
}

export function CueMarkers({ duration, stemId }: Props) {
  const allMarkers = useTrackStore((s) => s.cueMarkers)
  const cueMarkers = allMarkers.filter((m) => m.stemId === stemId)
  const selectedMarkerId = useTrackStore((s) => s.selectedMarkerId)
  const setSelectedMarkerId = useTrackStore((s) => s.setSelectedMarkerId)
  const updateCueMarker = useTrackStore((s) => s.updateCueMarker)
  const removeCueMarker = useTrackStore((s) => s.removeCueMarker)
  const currentPps = useTrackStore((s) => s.currentPps)
  const scrollStartTime = useTrackStore((s) => s.scrollStartTime)
  const containerWidth = useTrackStore((s) => s.containerWidth)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  if (duration === 0 || currentPps === 0) return null

  // Visible time window
  const visibleEndTime = scrollStartTime + containerWidth / currentPps

  // Compute stagger rows for visible markers to avoid label overlap
  // Each row is 14px apart; we assign a row index based on pixel proximity
  const BADGE_PX = 22  // badge width + gap
  const visibleMarkers = cueMarkers.filter(
    (m) => m.time >= scrollStartTime - 2 && m.time <= visibleEndTime + 2
  )
  const rowAssignment = new Map<string, number>()
  for (const m of visibleMarkers) {
    const px = (m.time - scrollStartTime) * currentPps
    // Find the lowest row where no prior marker is within BADGE_PX
    let row = 0
    while (true) {
      const conflict = visibleMarkers.find((other) => {
        if (other.id === m.id) return false
        if ((rowAssignment.get(other.id) ?? 0) !== row) return false
        const otherPx = (other.time - scrollStartTime) * currentPps
        return Math.abs(px - otherPx) < BADGE_PX
      })
      if (!conflict) break
      row++
    }
    rowAssignment.set(m.id, row)
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
      {visibleMarkers.map((marker) => {
        const left = (marker.time - scrollStartTime) * currentPps
        const isSelected = marker.id === selectedMarkerId
        const labelRow = rowAssignment.get(marker.id) ?? 0
        const labelTop = 28 + labelRow * 14  // px from top

        return (
          <div
            key={marker.id}
            className="absolute top-0 bottom-0 pointer-events-auto"
            style={{ left }}
          >
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 cursor-pointer"
              style={{ backgroundColor: marker.color, opacity: isSelected ? 1 : 0.75 }}
              onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
            />

            {/* Number badge */}
            <div
              className="absolute top-1 -translate-x-1/2 cursor-pointer select-none"
              style={{ left: 1 }}
              onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
              onDoubleClick={() => { setEditingId(marker.id); setEditLabel(marker.label) }}
            >
              <div
                className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-zinc-900 shadow"
                style={{ backgroundColor: marker.color }}
              >
                {marker.number === 10 ? 0 : marker.number > 10 ? marker.number - 10 : marker.number}
                {marker.number > 10 && <span className="text-[7px] leading-none ml-0.5">A</span>}
              </div>
            </div>

            {/* Label — staggered vertically */}
            {marker.label && (
              <div
                className="absolute -translate-x-1/2 text-[10px] font-mono whitespace-nowrap px-1 rounded pointer-events-none"
                style={{ left: 1, top: labelTop, color: marker.color, backgroundColor: '#09090b99' }}
              >
                {marker.label}
              </div>
            )}

            {/* Selected: label edit popup */}
            {isSelected && editingId === marker.id && (
              <div className="absolute top-8 left-2 z-20 pointer-events-auto">
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateCueMarker(marker.id, { label: editLabel })
                      setEditingId(null)
                    }
                    if (e.key === 'Escape') setEditingId(null)
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      if (editLabel === '') {
                        removeCueMarker(marker.id)
                        setEditingId(null)
                        setSelectedMarkerId(null)
                      }
                    }
                    e.stopPropagation()
                  }}
                  onBlur={() => { updateCueMarker(marker.id, { label: editLabel }); setEditingId(null) }}
                  placeholder="Label (Enter to save)"
                  className="w-36 bg-zinc-800 border border-indigo-500 rounded px-2 py-0.5 text-xs font-mono text-zinc-100 focus:outline-none shadow-lg"
                />
              </div>
            )}

            {/* Selected: delete hint */}
            {isSelected && editingId !== marker.id && (
              <div
                className="absolute top-8 left-2 text-[9px] text-zinc-500 whitespace-nowrap pointer-events-none"
              >
                ↵ label · Del remove
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
