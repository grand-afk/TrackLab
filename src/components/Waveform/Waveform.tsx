import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTrackStore, type Stem } from '../../store/useTrackStore'

type Props = {
  stem: Stem
  audioBuffer: AudioBuffer | null
  wsRef: React.MutableRefObject<WaveSurfer | null>
}

function extractPeaks(buf: AudioBuffer): Float32Array[] {
  const peaks: Float32Array[] = []
  for (let c = 0; c < buf.numberOfChannels; c++) {
    peaks.push(buf.getChannelData(c))
  }
  return peaks
}

export function Waveform({ stem, audioBuffer, wsRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)
  const zoomH = useTrackStore((s) => s.zoomH)
  const setPlayheadTime = useTrackStore((s) => s.setPlayheadTime)
  const setPlaying = useTrackStore((s) => s.setPlaying)
  const updateStem = useTrackStore((s) => s.updateStem)

  // Create WaveSurfer once
  useEffect(() => {
    if (!containerRef.current) return
    loadedRef.current = false

    const ws = WaveSurfer.create({
      container: containerRef.current,
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
      backend: 'MediaElement',   // avoids a second WebAudio decode
    })

    wsRef.current = ws

    ws.on('ready', () => {
      updateStem(stem.id, { duration: ws.getDuration() })
      ws.zoom(zoomH * 20)
    })
    ws.on('timeupdate', (t) => setPlayheadTime(t))
    ws.on('play',   () => setPlaying(true))
    ws.on('pause',  () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))

    return () => { ws.destroy(); wsRef.current = null; loadedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stem.id])

  // Load once we have the decoded buffer — pass peaks so WaveSurfer renders
  // the waveform immediately without its own decode pass
  useEffect(() => {
    if (!wsRef.current || !audioBuffer || !stem.file || loadedRef.current) return
    loadedRef.current = true
    const peaks = extractPeaks(audioBuffer)
    wsRef.current
      .loadBlob(stem.file, peaks, audioBuffer.duration)
      .catch((err: unknown) => console.error('WaveSurfer loadBlob error:', err))
  }, [audioBuffer, stem.file, wsRef])

  useEffect(() => {
    wsRef.current?.zoom(zoomH * 20)
  }, [zoomH, wsRef])

  return (
    <div className="relative min-h-[80px]">
      <div ref={containerRef} className="wavesurfer-wrapper" />
    </div>
  )
}
