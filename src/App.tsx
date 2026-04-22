import { useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Settings2, Download } from 'lucide-react'
import { DropZone } from './components/DropZone/DropZone'
import { StemRow } from './components/Waveform/StemRow'
import { Transport } from './components/Transport/Transport'
import { Settings } from './components/Settings/Settings'
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
  const setAnalysing = useTrackStore((s) => s.setAnalysing)
  const analysing = useTrackStore((s) => s.analysing)
  const annotations = useTrackStore((s) => s.annotations)
  const zoomH = useTrackStore((s) => s.zoomH)
  const setZoomH = useTrackStore((s) => s.setZoomH)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map())

  // One WaveSurfer ref per stem (keyed by stem id)
  const wsRefs = useRef<Map<string, React.MutableRefObject<WaveSurfer | null>>>(new Map())

  const decode = useDecodeAudioFile()

  function getWsRef(id: string) {
    if (!wsRefs.current.has(id)) {
      wsRefs.current.set(id, { current: null })
    }
    return wsRefs.current.get(id)!
  }

  const handleFiles = useCallback(async (files: File[]) => {
    const remaining = MAX_STEMS - stems.length
    const toAdd = files.slice(0, remaining)
    if (!toAdd.length) return

    setAnalysing(true)
    for (const file of toAdd) {
      const id = crypto.randomUUID()
      const url = URL.createObjectURL(file)
      const stem: Stem = {
        id, name: file.name.replace(/\.[^.]+$/, ''), file, url,
        bpm: null, key: null, scale: null, duration: 0,
        color: '#6366f1', muted: false, solo: false,
      }
      addStem(stem)

      decode(file).then((buf) => {
        setAudioBuffers((m) => new Map(m).set(id, buf))
        analyseAudio(buf).then(({ bpm, key, scale }) => {
          useTrackStore.getState().updateStem(id, { bpm, key, scale })
        }).catch(console.error)
      }).catch(console.error)
    }
    setAnalysing(false)
  }, [stems.length, addStem, decode, setAnalysing])

  const longestDuration = stems.reduce((max, s) => Math.max(max, s.duration), 0)

  function playAll() {
    wsRefs.current.forEach((ref) => ref.current?.play())
    setPlaying(true)
  }
  function pauseAll() {
    wsRefs.current.forEach((ref) => ref.current?.pause())
    setPlaying(false)
  }
  function stopAll() {
    wsRefs.current.forEach((ref) => { ref.current?.stop(); })
    setPlaying(false)
    setPlayheadTime(0)
  }

  async function doExport() {
    const md = exportMarkdown(stems, annotations)
    const date = new Date().toISOString().split('T')[0]
    await triggerExport(md, `tracklab-${date}.md`)
  }

  useKeyBindings({
    'play-pause': () => useTrackStore.getState().isPlaying ? pauseAll() : playAll(),
    'stop': stopAll,
    'zoom-in': () => setZoomH(zoomH + 0.5),
    'zoom-out': () => setZoomH(zoomH - 0.5),
    'settings': () => setSettingsOpen(true),
    'export': doExport,
  })

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-widest uppercase text-indigo-400">TrackLab</span>
          {analysing && (
            <span className="text-xs text-zinc-500 animate-pulse ml-2">Analysing…</span>
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

      {/* Transport */}
      {stems.length > 0 && (
        <Transport
          onPlay={playAll}
          onPause={pauseAll}
          onStop={stopAll}
          duration={longestDuration}
        />
      )}

      {/* Main scroll area */}
      <div className="flex-1 overflow-y-auto">
        {stems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
            <div className="w-full max-w-lg">
              <DropZone onFiles={handleFiles} disabled={analysing} />
            </div>
            <p className="text-xs text-zinc-600 text-center">
              Supports MP3, WAV, FLAC, AAC, M4A · Up to 6 stems · Install as PWA for iOS share sheet
            </p>
          </div>
        ) : (
          <div>
            {stems.map((stem, i) => (
              <StemRow
                key={stem.id}
                stem={stem}
                audioBuffer={audioBuffers.get(stem.id) ?? null}
                wsRef={getWsRef(stem.id)}
                isFirst={i === 0}
              />
            ))}
            {stems.length < MAX_STEMS && (
              <div className="p-4">
                <DropZone onFiles={handleFiles} disabled={analysing} />
              </div>
            )}
          </div>
        )}
      </div>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
