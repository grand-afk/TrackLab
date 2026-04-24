import { useRef, useCallback } from 'react'

let ctx: AudioContext | null = null

type AnyAudioContext = typeof AudioContext

export function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    const AC: AnyAudioContext =
      window.AudioContext ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

export function useDecodeAudioFile() {
  const contextRef = useRef<AudioContext | null>(null)

  const decode = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ac = getAudioContext()
    contextRef.current = ac
    // Fire-and-forget resume — decodeAudioData works regardless of context state,
    // but we need the context running later for playback (iOS requires gesture).
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    const ab = await file.arrayBuffer()
    // Use callback form: the Promise form of decodeAudioData hangs on iOS WebKit.
    return new Promise<AudioBuffer>((resolve, reject) => {
      ac.decodeAudioData(ab, resolve, (err) =>
        reject(err instanceof Error ? err : new Error('Audio decode failed'))
      )
    })
  }, [])

  return decode
}
