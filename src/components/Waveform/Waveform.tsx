import { useEffect, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTrackStore, type Stem } from '../../store/useTrackStore'

type Props = {
  stem: Stem
  audioBuffer: AudioBuffer | null
  wsRef: React.MutableRefObject<WaveSurfer | null>
}

export function Waveform({ stem, audioBuffer, wsRef }: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [ws, setWs] = useState<WaveSurfer | null>(null)

  const zoomH = useTrackStore((s) => s.zoomH)
  const setPlayheadTime = useTrackStore((s) => s.setPlayheadTime)
  const setPlaying = useTrackStore((s) => s.setPlaying)
  const updateStem = useTrackStore((s) => s.updateStem)

  // Create WaveSurfer when container is ready
  useEffect(() => {
    if (!container) return

    const instance = WaveSurfer.create({
      container,
      waveColor: stem.color + '99',
      progressColor: stem.color,
      cursorColor: '#ffffff40',
      cursorWidth: 1,
      height: 80,
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
    })

    wsRef.current = instance
    setWs(instance)

    instance.on('timeupdate', (t) => setPlayheadTime(t))
    instance.on('play',   () => setPlaying(true))
    instance.on('pause',  () => setPlaying(false))
    instance.on('finish', () => setPlaying(false))

    return () => {
      instance.destroy()
      wsRef.current = null
      setWs(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, stem.id])

  // Load audio once both WaveSurfer instance and decoded buffer are ready.
  // Using `ws` (state) as a dep means this re-runs correctly after StrictMode
  // double-mounts, when a new instance replaces the destroyed one.
  useEffect(() => {
    if (!ws || !audioBuffer || !stem.file) return

    const peaks: Float32Array[] = []
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      peaks.push(audioBuffer.getChannelData(c))
    }

    ws.loadBlob(stem.file, peaks, audioBuffer.duration)
      .then(() => {
        updateStem(stem.id, { duration: audioBuffer.duration })
        ws.zoom(zoomH * 20)
      })
      .catch((err: unknown) => console.error('WaveSurfer load error:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, audioBuffer])

  // Zoom when slider changes, only after audio is loaded
  useEffect(() => {
    if (!ws) return
    try { ws.zoom(zoomH * 20) } catch { /* not loaded yet */ }
  }, [ws, zoomH])

  return (
    <div className="relative min-h-[80px]">
      <div ref={setContainer} />
    </div>
  )
}
