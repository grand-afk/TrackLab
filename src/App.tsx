import { useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Settings2, Download } from 'lucide-react'
import { DropZone } from './components/DropZone/DropZone'
import { StemRow } from './components/Waveform/StemRow'
import { Transport } from './components/Transport/Transport'
import { Settings } from './components/Settings/Settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTrackStore } from './store/useTrackStore'
import { useDecodeAudioFile } from './hooks/useAudioEngine'
import { useKeyBindings } from './hooks/useKeyBindings'
import { analyseAudio } from './lib/essentia'
import { exportMarkdown, triggerExport } from './lib/export'
import type { Stem } from './store/useTrackStore'

const MAX_STEMS = 6

export default function App() {
  const stems = useTrackStore((s) => s.stems)
  const addStem = useTrackStore((s) => s.addStem)
  const setPlaying = useTrackStore((s) => s.setPlaying)
  const setPlayheadTime = useTrackStore((s) => s.setPlayheadTime)
  const annotations = useTrackStore((s) => s.annotations)
  const zoomH = useTrackStore((s) => s.zoomH)
  const setZoomH = useTrackStore((s) => s.setZoomH)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // audioBuffers lives outside Zustand — AudioBuffer is not serialisable
  const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map())

  // One WaveSurfer ref per stem (keyed by stem id)
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
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        file,
        url: URL.createObjectURL(file),
        bpm: null,
        key: null,
        scale: null,
        duration: 0,
        color: '#6366f1',
        muted: false,
        solo: false,
      }
      addStem(stem)

      // Decode once — feed the same buffer to WaveSurfer + analysis worker
      decode(file)
        .then((buf) => {
          setAudioBuffers((m) => new Map(m).set(id, buf))
          return analyseAudio(buf)
        })
        .then(({ bpm, key, scale }) => {
          useTrackStore.getState().updateStem(id, { bpm, key, scale })
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          setError(`Failed to process "${file.name}": ${msg}`)
          console.error(err)
        })
    }
  }, [addStem, decode])

  const longestDuration = stems.reduce((max, s) => Math.max(max, s.duration), 0)

  function playAll()  { wsRefs.current.forEach((r) => r.current?.play());  setPlaying(true)  }
  function pauseAll() { wsRefs.current.forEach((r) => r.current?.pause()); setPlaying(false) }
  function stopAll()  {
    wsRefs.current.forEach((r) => r.current?.stop())
    setPlaying(false)
    setPlayheadTime(0)
  }

  async function doExport() {
    const md = exportMarkdown(stems, annotations)
    await triggerExport(md, `tracklab-${new Date().toISOString().split('T')[0]}.md`)
  }

  useKeyBindings({
    'play-pause': () => useTrackStore.getState().isPlaying ? pauseAll() : playAll(),
    'stop': stopAll,
    'zoom-in': () => setZoomH(zoomH + 0.5),
    'zoom-out': () => setZoomH(zoomH - 0.5),
    'settings': () => setSettingsOpen(true),
    'export': doExport,
  })

  const decoding = stems.some((s) => !audioBuffers.has(s.id))
  const analysing = stems.some((s) => audioBuffers.has(s.id) && s.bpm === null)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-widest uppercase text-indigo-400">TrackLab</span>
          {decoding && (
            <span className="text-xs text-indigo-400/70 ml-2">Decoding…</span>
          )}
          {!decoding && analysing && (
            <span className="text-xs text-zinc-500 ml-2">Analysing BPM + key…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Export (Ctrl+E)"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            title="Settings (Ctrl+,)"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-b border-red-800 text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-600 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Transport */}
      {stems.length > 0 && (
        <Transport onPlay={playAll} onPause={pauseAll} onStop={stopAll} duration={longestDuration} />
      )}

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {stems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div className="w-full max-w-lg">
              <DropZone onFiles={handleFiles} />
            </div>
            <p className="text-xs text-zinc-600 text-center">
              MP3 · WAV · FLAC · AAC · M4A · Up to 6 stems · Install as PWA for iOS share sheet
            </p>
          </div>
        ) : (
          <div>
            <ErrorBoundary fallback={(e) => (
              <div className="p-6 text-sm text-red-400 font-mono">Render error: {e.message}</div>
            )}>
              {stems.map((stem, i) => (
                <StemRow
                  key={stem.id}
                  stem={stem}
                  audioBuffer={audioBuffers.get(stem.id) ?? null}
                  wsRef={getWsRef(stem.id)}
                  isFirst={i === 0}
                />
              ))}
            </ErrorBoundary>
            {stems.length < MAX_STEMS && (
              <div className="p-4">
                <DropZone onFiles={handleFiles} />
              </div>
            )}
          </div>
        )}
      </div>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
