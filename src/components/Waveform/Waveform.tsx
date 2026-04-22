import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useTrackStore, type Stem } from '../../store/useTrackStore'

type Props = {
  stem: Stem
  wsRef: React.MutableRefObject<WaveSurfer | null>
}

export function Waveform({ stem, wsRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomH = useTrackStore((s) => s.zoomH)
  const setPlayheadTime = useTrackStore((s) => s.setPlayheadTime)
  const setPlaying = useTrackStore((s) => s.setPlaying)
  const updateStem = useTrackStore((s) => s.updateStem)

  useEffect(() => {
    if (!containerRef.current) return

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
    })

    wsRef.current = ws
    ws.load(stem.url)

    ws.on('ready', () => {
      updateStem(stem.id, { duration: ws.getDuration() })
      ws.zoom(zoomH * 20)
    })
    ws.on('timeupdate', (t) => setPlayheadTime(t))
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))

    return () => ws.destroy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stem.id, stem.url])

  useEffect(() => {
    wsRef.current?.zoom(zoomH * 20)
  }, [zoomH, wsRef])

  return (
    <div className="relative">
      <div ref={containerRef} className="wavesurfer-wrapper" />
    </div>
  )
}
