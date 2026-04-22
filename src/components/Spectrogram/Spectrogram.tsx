import { useEffect, useRef, useState } from 'react'

type Props = {
  audioBuffer: AudioBuffer
  height?: number
}

// Scientific heatmap: black → purple → red → yellow → white
function heatmapColor(t: number): [number, number, number] {
  if (t < 0.25) {
    const s = t / 0.25
    return [Math.round(s * 128), 0, Math.round(s * 128)]
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25
    return [128 + Math.round(s * 127), 0, Math.round((1 - s) * 128)]
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25
    return [255, Math.round(s * 255), 0]
  } else {
    const s = (t - 0.75) / 0.25
    return [255, 255, Math.round(s * 255)]
  }
}

async function buildSpectrogram(
  audioBuffer: AudioBuffer,
  fftSize: number,
  hopSize: number
): Promise<{ cols: Float32Array[]; freqBins: number }> {
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const numCols = Math.floor((audioBuffer.length - fftSize) / hopSize)
  const freqBins = fftSize / 2
  const cols: Float32Array[] = []

  // Render offline at each hop position using OfflineAudioContext + AnalyserNode
  // We batch into one offline render: connect source → analyser → destination
  // Then read the frequency data slice by slice via script processing trick.
  // Simpler: render the whole buffer offline to get the PCM, then do STFT in JS
  // using typed arrays — but we use the browser's FFT via AnalyserNode in
  // a series of small OfflineAudioContexts (one per column).
  //
  // For real performance we'd do this in a worker. For Phase 1, cap at 500 cols.

  const cappedCols = Math.min(numCols, 500)
  const stride = Math.floor(numCols / cappedCols)

  for (let i = 0; i < cappedCols; i++) {
    const offsetSamples = i * stride * hopSize
    const offsetTime = offsetSamples / sampleRate
    const segmentDuration = fftSize / sampleRate

    const offline = new OfflineAudioContext(1, fftSize, sampleRate)
    const src = offline.createBufferSource()
    src.buffer = audioBuffer
    src.start(0, offsetTime)

    const analyser = offline.createAnalyser()
    analyser.fftSize = fftSize
    src.connect(analyser)
    analyser.connect(offline.destination)

    await offline.startRendering()

    const mag = new Float32Array(freqBins)
    analyser.getFloatFrequencyData(mag)
    // Convert dB to linear [0,1], typical range -100..0 dBFS
    for (let k = 0; k < freqBins; k++) {
      mag[k] = Math.max(0, (mag[k] + 100) / 100)
    }
    cols.push(mag)
    void segmentDuration // suppress unused warning
    void duration
  }

  return { cols, freqBins }
}

export function Spectrogram({ audioBuffer, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [building, setBuilding] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    setBuilding(true)
    const fftSize = 2048

    buildSpectrogram(audioBuffer, fftSize, fftSize / 4).then(({ cols, freqBins }) => {
      canvas.width = cols.length
      canvas.height = freqBins
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.createImageData(cols.length, freqBins)
      const data = imageData.data

      for (let col = 0; col < cols.length; col++) {
        for (let bin = 0; bin < freqBins; bin++) {
          const t = cols[col][bin]
          const [r, g, b] = heatmapColor(t)
          const row = freqBins - 1 - bin
          const idx = (row * cols.length + col) * 4
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255
        }
      }
      ctx.putImageData(imageData, 0, 0)
      setBuilding(false)
    })
  }, [audioBuffer])

  return (
    <div className="relative" style={{ height }}>
      {building && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
          Building spectrogram…
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
        className="block rounded"
      />
    </div>
  )
}
