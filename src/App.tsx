import { useRef, useState, useCallback, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Settings2, Download } from 'lucide-react'
import { DropZone } from './components/DropZone/DropZone'
import { StemRow } from './components/Waveform/StemRow'
import { Transport } from './components/Transport/Transport'
import { MarkerPanel } from './components/Markers/MarkerPanel'
import { Settings } from './components/Settings/Settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTrackStore, MARKER_COLORS, getSkipSeconds } from './store/useTrackStore'
import { WaveScrollBar } from './components/WaveScrollBar'
import { useDecodeAudioFile, getAudioContext } from './hooks/useAudioEngine'
import { useKeyBindings } from './hooks/useKeyBindings'
import { analyseAudio } from './lib/essentia'
import { exportMarkdown, triggerExport } from './lib/export'
import type { Stem } from './store/useTrackStore'

const MAX_STEMS = 6

// e.code values for digit row — stable regardless of Shift/Alt modifiers
const CODE_MAP: Record<string, number> = {
  'Digit1':1,'Digit2':2,'Digit3':3,'Digit4':4,'Digit5':5,
  'Digit6':6,'Digit7':7,'Digit8':8,'Digit9':9,'Digit0':10,
}
// e.key values for Ctrl+digit (Ctrl doesn't remap key values on any OS)
const KEY_MAP: Record<string, number> = {
  '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'0':10,
}

export default function App() {
  const stems               = useTrackStore((s) => s.stems)
  const addStem             = useTrackStore((s) => s.addStem)
  const setPlaying          = useTrackStore((s) => s.setPlaying)
  const setPlayheadTime     = useTrackStore((s) => s.setPlayheadTime)
  const annotations         = useTrackStore((s) => s.annotations)
  const cueMarkers          = useTrackStore((s) => s.cueMarkers)
  const addCueMarker        = useTrackStore((s) => s.addCueMarker)
  const updateCueMarker     = useTrackStore((s) => s.updateCueMarker)
  const removeCueMarker     = useTrackStore((s) => s.removeCueMarker)
  const clearCueMarkers     = useTrackStore((s) => s.clearCueMarkers)
  const setSelectedMarkerId = useTrackStore((s) => s.setSelectedMarkerId)
  const zoomH               = useTrackStore((s) => s.zoomH)
  const setZoomH            = useTrackStore((s) => s.setZoomH)
  const setScrollStartTime  = useTrackStore((s) => s.setScrollStartTime)

  const [markerPanelEditingId, setMarkerPanelEditingId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map())

  const addInputRef = useRef<HTMLInputElement>(null)
  const wsRefs = useRef<Map<string, React.MutableRefObject<WaveSurfer | null>>>(new Map())
  const decode = useDecodeAudioFile()

  function getWsRef(id: string) {
    if (!wsRefs.current.has(id)) wsRefs.current.set(id, { current: null })
    return wsRefs.current.get(id)!
  }

  const handleFiles = useCallback(async (files: File[]) => {
    setError(null)
    const remaining = MAX_STEMS - useTrackStore.getState().stems.length
    const toAdd = files.slice(0, remaining)
    if (!toAdd.length) return

    for (const file of toAdd) {
      const id = crypto.randomUUID()
      const stem: Stem = {
        id, name: file.name.replace(/\.[^.]+$/, ''), file,
        url: URL.createObjectURL(file),
        bpm: null, key: null, scale: null, duration: 0,
        color: '#6366f1', muted: false, solo: false,
      }
      addStem(stem)
      decode(file)
        .then((buf) => {
          setAudioBuffers((m) => new Map(m).set(id, buf))
          return analyseAudio(buf)
        })
        .then(({ bpm, key, scale }) => {
          useTrackStore.getState().updateStem(id, { bpm, key, scale })
        })
        .catch((err: unknown) => {
          setError(`Failed: ${err instanceof Error ? err.message : String(err)}`)
        })
    }
  }, [addStem, decode])

  const longestDuration = stems.reduce((max, s) => Math.max(max, s.duration), 0)

  function seekAll(seconds: number) {
    if (longestDuration <= 0) return
    wsRefs.current.forEach((r) => r.current?.seekTo(seconds / longestDuration))
    setPlayheadTime(seconds)
  }
  function playAll()  {
    // Resume the shared AudioContext on this user gesture (required on iOS)
    getAudioContext().resume().catch(() => {})
    wsRefs.current.forEach((r) => r.current?.play())
    setPlaying(true)
  }
  function pauseAll() { wsRefs.current.forEach((r) => r.current?.pause()); setPlaying(false) }
  function stopAll()  {
    wsRefs.current.forEach((r) => r.current?.stop())
    setPlaying(false); setPlayheadTime(0)
  }

  function handleSkip(fine: boolean, direction: 1 | -1) {
    const skipSecs = getSkipSeconds(fine)
    const t = Math.max(0, Math.min(longestDuration, useTrackStore.getState().playheadTime + skipSecs * direction))
    seekAll(t)
  }

  async function doExport() {
    await triggerExport(exportMarkdown(stems, annotations),
      `tracklab-${new Date().toISOString().split('T')[0]}.md`)
  }

  function dropMarker(num: number) {
    const stemId = useTrackStore.getState().focusedStemId
    if (!stemId) return
    addCueMarker({
      id: crypto.randomUUID(), stemId, number: num,
      time: useTrackStore.getState().playheadTime,
      label: '', color: MARKER_COLORS[(num - 1) % MARKER_COLORS.length],
    })
  }

  function nudgeMarker(delta: number) {
    const { selectedMarkerId, cueMarkers: markers } = useTrackStore.getState()
    if (!selectedMarkerId) return
    const m = markers.find((c) => c.id === selectedMarkerId)
    if (m) updateCueMarker(selectedMarkerId, {
      time: Math.max(0, Math.min(longestDuration, m.time + delta)),
    })
  }

  // Cross-stem playhead sync: any waveform click triggers seekAll
  useEffect(() => {
    const handler = (e: Event) => seekAll((e as CustomEvent<number>).detail)
    window.addEventListener('tracklab:userseeked', handler)
    return () => window.removeEventListener('tracklab:userseeked', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [longestDuration])

  // Marker number keys: 1-0 and Alt+1-0; Shift+1-0 deletes; A-F focuses stem
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return

      // A–F: focus stem by letter
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key.length === 1) {
        const letterIdx = 'abcdef'.indexOf(e.key.toLowerCase())
        if (letterIdx !== -1) {
          const target = useTrackStore.getState().stems[letterIdx]
          if (target) { e.preventDefault(); useTrackStore.getState().setFocusedStemId(target.id) }
          return
        }
      }

      const num = CODE_MAP[e.code]
      if (!num) return
      if (e.ctrlKey) return  // Ctrl+digit = jump-to-marker, handled below

      e.preventDefault()
      if (e.shiftKey) {
        // Shift+digit: delete marker by number on focused stem
        const targetNum = e.altKey ? num + 10 : num
        const { focusedStemId: fsid, cueMarkers: markers, selectedMarkerId: selId } = useTrackStore.getState()
        if (!fsid) return
        const m = markers.find((c) => c.stemId === fsid && c.number === targetNum)
        if (m) {
          removeCueMarker(m.id)
          if (selId === m.id) setSelectedMarkerId(null)
        }
      } else {
        dropMarker(e.altKey ? num + 10 : num)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Arrow keys: nudge selected marker OR skip; Ctrl+digit: jump to marker
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      const { selectedMarkerId, focusedStemId: fsid } = useTrackStore.getState()

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? -1 : 1
        if (selectedMarkerId) {
          e.preventDefault()
          const delta = e.ctrlKey && e.shiftKey ? 0.001 : e.shiftKey ? 0.01 : 0.1
          nudgeMarker(dir * delta)
        } else {
          e.preventDefault()
          handleSkip(e.shiftKey, dir as 1 | -1)
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMarkerId) {
        e.preventDefault()
        removeCueMarker(selectedMarkerId)
        setSelectedMarkerId(null)
      }

      // Ctrl+1–0 / Ctrl+Alt+1–0: jump to marker on focused stem
      if (e.ctrlKey && !e.shiftKey) {
        const num = KEY_MAP[e.key]
        if (num !== undefined) {
          e.preventDefault()
          const targetNum = e.altKey ? num + 10 : num
          const { cueMarkers: markers } = useTrackStore.getState()
          const m = markers.find((c) => c.number === targetNum && c.stemId === fsid)
          if (m) seekAll(m.time)
        }
      }

      // F2: edit label of selected marker
      if (e.key === 'F2') {
        e.preventDefault()
        const { selectedMarkerId: sid } = useTrackStore.getState()
        if (sid) {
          ;(window as Window & { __tlFocusLabel?: (id: string) => void }).__tlFocusLabel?.(sid)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [longestDuration])

  const decoding  = stems.some((s) => !audioBuffers.has(s.id))
  const analysing = stems.some((s) => audioBuffers.has(s.id) && s.bpm === null)

  // Clear markers: scoped to focused stem
  function clearFocusedMarkers() {
    clearCueMarkers(useTrackStore.getState().focusedStemId ?? undefined)
  }

  useKeyBindings({
    'play-pause':    () => useTrackStore.getState().isPlaying ? pauseAll() : playAll(),
    'stop':          stopAll,
    'skip-start':    () => seekAll(0),
    'zoom-in':       () => setZoomH(zoomH + 0.5),
    'zoom-out':      () => setZoomH(zoomH - 0.5),
    'goto':          () => window.dispatchEvent(new Event('tracklab:goto')),
    'settings':      () => setSettingsOpen(true),
    'export':        doExport,
    'clear-markers': clearFocusedMarkers,
  })

  const hasAnyMarkers = cueMarkers.length > 0

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <span className="text-sm font-bold tracking-widest uppercase text-indigo-400 select-none">TrackLab</span>
        <div className="flex items-center gap-2">
          {decoding   && <span className="text-xs text-indigo-400/70">Decoding…</span>}
          {!decoding && analysing && <span className="text-xs text-zinc-500">Analysing…</span>}
          <button onClick={doExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Export (Ctrl+E)">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            title="Settings (Ctrl+,)">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-b border-red-800 text-xs text-red-400 flex items-center justify-between shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Transport */}
      {stems.length > 0 && (
        <Transport
          onPlay={playAll} onPause={pauseAll} onStop={stopAll}
          onSeek={seekAll} onSkip={handleSkip} duration={longestDuration}
          onAddFile={() => addInputRef.current?.click()}
        />
      )}

      <input ref={addInputRef} type="file" accept=".mp3,.wav,.wave,.flac,.aac,.m4a,.ogg,.opus,.aiff,.aif,audio/*" multiple className="sr-only"
        onChange={(e) => { if (e.target.files) handleFiles(Array.from(e.target.files)); e.target.value = '' }}
      />

      {/* Single scrollbar above stems */}
      {stems.length > 0 && (
        <WaveScrollBar duration={longestDuration} onScroll={setScrollStartTime} />
      )}

      {/* Main */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {stems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <div className="w-full max-w-lg">
              <DropZone onFiles={handleFiles} />
            </div>
            <p className="text-xs text-zinc-600 text-center">
              MP3 · WAV · FLAC · AAC · M4A · up to 6 stems<br />
              Click a stem to focus it, then press 1–0 to drop cue markers
            </p>
          </div>
        ) : (
          <>
            <ErrorBoundary fallback={(e) => (
              <div className="p-6 text-sm text-red-400 font-mono">Render error: {e.message}</div>
            )}>
              {stems.map((stem, i) => (
                <StemRow key={stem.id} stem={stem} stemIndex={i}
                  audioBuffer={audioBuffers.get(stem.id) ?? null}
                  wsRef={getWsRef(stem.id)} isFirst={i === 0}
                  onSeek={seekAll} />
              ))}
            </ErrorBoundary>
            {hasAnyMarkers && (
              <MarkerPanel
                onSeek={seekAll}
                onClearStem={(stemId) => clearCueMarkers(stemId)}
                editingId={markerPanelEditingId}
                setEditingId={setMarkerPanelEditingId}
              />
            )}
          </>
        )}
      </div>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
