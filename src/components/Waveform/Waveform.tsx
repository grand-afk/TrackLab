import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any
import { useTrackStore, type Stem } from '../../store/useTrackStore'

type Props = {
  stem: Stem
  audioBuffer: AudioBuffer | null
  wsRef: React.MutableRefObject<WaveSurfer | null>
  isFirst: boolean    // only first stem shows Timeline + BeatGrid ruler
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export function Waveform({ stem, audioBuffer, wsRef, isFirst }: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [ws, setWs] = useState<WaveSurfer | null>(null)
  const zoomH = useTrackStore((s) => s.zoomH)
  const currentPps = useTrackStore((s) => s.currentPps)
  const scrollStartTime = useTrackStore((s) => s.scrollStartTime)
  const setPlayheadTime = useTrackStore((s) => s.setPlayheadTime)
  const setPlaying = useTrackStore((s) => s.setPlaying)
  const updateStem = useTrackStore((s) => s.updateStem)
  const setCurrentPps = useTrackStore((s) => s.setCurrentPps)
  const setScrollStartTime = useTrackStore((s) => s.setScrollStartTime)
  const setContainerWidth = useTrackStore((s) => s.setContainerWidth)
  const fitPpsRef      = useRef(0)
  const scrollWrapperRef = useRef<HTMLElement | null>(null)

  // Create WaveSurfer when container mounts
  useEffect(() => {
    if (!container) return

    const plugins: AnyPlugin[] = [
      ZoomPlugin.create({
        maxZoom: 2000,
        exponentialZooming: true,
        iterations: 25,
      }),
    ]

    if (isFirst) {
      plugins.unshift(
        TimelinePlugin.create({
          height: 28,
          insertPosition: 'beforebegin',
          style: {
            fontSize: '11px',
            fontFamily: 'ui-monospace, monospace',
            color: '#71717a',
            borderBottom: '1px solid #27272a',
          },
          formatTimeCallback: formatTime,
          primaryLabelInterval: 10,
          secondaryLabelInterval: 5,
          timeInterval: 1,
        })
      )
    }

    const instance = WaveSurfer.create({
      container,
      waveColor: stem.color + 'aa',
      progressColor: stem.color,
      cursorColor: '#ffffff',
      cursorWidth: 2,
      height: 80,
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      plugins,
    })

    wsRef.current = instance
    setWs(instance)

    instance.on('timeupdate', (t) => setPlayheadTime(t))
    instance.on('play',   () => setPlaying(true))
    instance.on('pause',  () => setPlaying(false))
    instance.on('finish', () => setPlaying(false))

    // User clicked waveform — sync all stems via parent seekAll
    instance.on('interaction', () => {
      const t = instance.getCurrentTime()
      window.dispatchEvent(new CustomEvent('tracklab:userseeked', { detail: t }))
    })

    // After zoom, read new scroll position so WaveScrollBar thumb stays in sync
    instance.on('zoom', (pps: number) => {
      setCurrentPps(pps)
      if (isFirst) {
        requestAnimationFrame(() => {
          const w = scrollWrapperRef.current
          if (w) setScrollStartTime(w.scrollLeft / pps)
        })
      }
    })

    // scrollbar hidden via CSS [part="scroll"] selector in index.css

    // Track container width via ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
      // Recompute fit zoom if duration known
      if (fitPpsRef.current > 0) {
        const dur = wsRef.current?.getDuration() ?? 0
        if (dur > 0) fitPpsRef.current = w / dur
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      instance.destroy()
      wsRef.current = null
      setWs(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, stem.id, isFirst])

  // Load audio and fit to screen once buffer is available
  useEffect(() => {
    if (!ws || !audioBuffer || !stem.file) return

    const peaks: Float32Array[] = []
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      peaks.push(audioBuffer.getChannelData(c))
    }

    ws.loadBlob(stem.file, peaks, audioBuffer.duration)
      .then(() => {
        updateStem(stem.id, { duration: audioBuffer.duration })
        // Fit whole track on screen
        const w = container?.getBoundingClientRect().width ?? 800
        const pps = w / audioBuffer.duration
        fitPpsRef.current = pps
        ws.zoom(pps)
        setCurrentPps(pps)
        setContainerWidth(w)
        // Capture scroll wrapper for programmatic scroll sync
        scrollWrapperRef.current = ws.getWrapper() ?? null
      })
      .catch((err: unknown) => console.error('WaveSurfer load error:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, audioBuffer])

  // Keyboard zoom (Ctrl + / -) still works via zoomH multiplier — first stem only
  useEffect(() => {
    if (!ws || !isFirst || fitPpsRef.current === 0) return
    try { ws.zoom(fitPpsRef.current * zoomH) } catch { /* not loaded */ }
  }, [ws, zoomH, isFirst])

  // Non-first stems follow the first stem's zoom level
  useEffect(() => {
    if (isFirst || !ws || currentPps === 0) return
    try { ws.zoom(currentPps) } catch { /* not loaded */ }
  }, [ws, currentPps, isFirst])

  // All stems sync scroll from store — ref avoids stale-closure issues with ws state
  useEffect(() => {
    const w = scrollWrapperRef.current
    if (!w || currentPps === 0) return
    w.scrollLeft = scrollStartTime * currentPps
  }, [scrollStartTime, currentPps])

  return (
    <div className="relative ws-host">
      <div ref={setContainer} />
    </div>
  )
}
