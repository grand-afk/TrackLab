import { useRef, useCallback } from 'react'

let ctx: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  return ctx
}

export function useDecodeAudioFile() {
  const contextRef = useRef<AudioContext | null>(null)

  const decode = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ac = getAudioContext()
    contextRef.current = ac
    if (ac.state === 'suspended') await ac.resume()
    const ab = await file.arrayBuffer()
    return ac.decodeAudioData(ab)
  }, [])

  return decode
}
