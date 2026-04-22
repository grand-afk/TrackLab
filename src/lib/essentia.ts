type AnalysisResult = { bpm: number; key: string; scale: string }
type PendingRequest = { resolve: (r: AnalysisResult) => void; reject: (e: Error) => void }

let worker: Worker | null = null
const pending = new Map<string, PendingRequest>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/essentia.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const { id, error, ...result } = e.data as { id: string; error?: string } & AnalysisResult
      const req = pending.get(id)
      if (!req) return
      pending.delete(id)
      if (error) req.reject(new Error(error))
      else req.resolve(result)
    }
  }
  return worker
}

export async function analyseAudio(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
  const channels: Float32Array[] = []
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    // Clone because we transfer ownership
    const src = audioBuffer.getChannelData(c)
    const copy = new Float32Array(src)
    channels.push(copy)
  }

  const id = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage(
      { id, type: 'analyse', channels, sampleRate: audioBuffer.sampleRate },
      channels.map((c) => c.buffer)
    )
  })
}
