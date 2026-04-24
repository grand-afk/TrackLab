import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import WebAudioPlayer from 'wavesurfer.js/dist/webaudio.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any
import { useTrackStore, type Stem } from '../../store/useTrackStore'
import { getAudioContext } from '../../hooks/useAudioEngine'

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
  const anySolo = useTrackStore((s) => s.stems.some((st) => st.solo))
  const fitPpsRef = useRef(0)
  // Track the last pixel value we set programmatically so we can ignore the echo scroll event
  const lastSetPxRef = useRef(-1)

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
      // Share a single AudioContext across all stems so bufferNode.start() fires
      // on the same clock — critical for iOS multi-stem sync.
      media: new WebAudioPlayer(getAudioContext()) as unknown as HTMLMediaElement,
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
      hideScrollbar: true,
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

    // WaveSurfer scroll event fires for both user-initiated and auto-scroll during playback.
    // Only first stem drives the store; ignore events that echo our own setScroll calls.
    instance.on('scroll', (startTime: number, _endTime: number, scrollLeftPx: number) => {
      if (!isFirst) return
      if (Math.round(scrollLeftPx) === Math.round(lastSetPxRef.current)) return
      lastSetPxRef.current = -1  // allow next auto-scroll to propagate
      setScrollStartTime(startTime)
    })

    // After zoom, read new scroll position so WaveScrollBar thumb stays in sync
    instance.on('zoom', (pps: number) => {
      setCurrentPps(pps)
      if (isFirst) {
        requestAnimationFrame(() => {
          const scroll = instance.getScroll()
          setScrollStartTime(scroll / pps)
        })
      }
    })

    // Track container width via ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
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
        const w = container?.getBoundingClientRect().width ?? 800
        const pps = w / audioBuffer.duration
        fitPpsRef.current = pps
        ws.zoom(pps)
        setCurrentPps(pps)
        setContainerWidth(w)
      })
      .catch((err: unknown) => console.error('WaveSurfer load error:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, audioBuffer])

  // Keyboard zoom (Ctrl + / -) via zoomH multiplier — first stem only
  useEffect(() => {
    if (!ws || !isFirst || fitPpsRef.current === 0) return
    try { ws.zoom(fitPpsRef.current * zoomH) } catch { /* not loaded */ }
  }, [ws, zoomH, isFirst])

  // Non-first stems follow the first stem's zoom level
  useEffect(() => {
    if (isFirst || !ws || currentPps === 0) return
    try { ws.zoom(currentPps) } catch { /* not loaded */ }
  }, [ws, currentPps, isFirst])

  // Apply mute / solo volume
  useEffect(() => {
    if (!ws) return
    const effective = stem.muted ? 0 : (anySolo && !stem.solo ? 0 : 1)
    try { ws.setVolume(effective) } catch { /* not loaded */ }
  }, [ws, stem.muted, stem.solo, anySolo])

  // All stems sync scroll from store — use official setScroll() API
  useEffect(() => {
    if (!ws || currentPps === 0) return
    const px = scrollStartTime * currentPps
    lastSetPxRef.current = px
    try { ws.setScroll(px) } catch { /* not loaded */ }
  }, [ws, scrollStartTime, currentPps])

  return (
    <div className="relative ws-host">
      <div ref={setContainer} />
    </div>
  )
}
