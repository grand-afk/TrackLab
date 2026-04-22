/// <reference lib="webworker" />

self.onmessage = (e: MessageEvent) => {
  const { id, type, channels, sampleRate } = e.data as {
    id: string; type: string; channels: Float32Array[]; sampleRate: number
  }
  if (type === 'analyse') {
    try {
      const mono = toMono(channels)
      const bpm = detectBpm(mono, sampleRate)
      const { key, scale } = detectKey(mono, sampleRate)
      self.postMessage({ id, bpm, key, scale })
    } catch (err) {
      self.postMessage({ id, error: String(err) })
    }
  }
}

function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const len = channels[0].length
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let s = 0
    for (const ch of channels) s += ch[i]
    out[i] = s / channels.length
  }
  return out
}

// ─── BPM: onset-envelope autocorrelation ───────────────────────────────────

function detectBpm(mono: Float32Array, sr: number): number {
  const frameSize = Math.round(sr * 0.023)
  const hopSize   = Math.round(sr * 0.01)
  const envelope: number[] = []
  let prevRms = 0

  for (let i = 0; i + frameSize < mono.length; i += hopSize) {
    let sum = 0
    for (let j = 0; j < frameSize; j++) sum += mono[i + j] ** 2
    const rms = Math.sqrt(sum / frameSize)
    envelope.push(Math.max(0, rms - prevRms))
    prevRms = rms
  }

  const minLag = Math.round((60 / 200) / 0.01)
  const maxLag = Math.round((60 / 40)  / 0.01)
  const n = envelope.length
  let bestLag = minLag, bestScore = -Infinity

  for (let lag = minLag; lag <= Math.min(maxLag, n - 1); lag++) {
    let score = 0
    for (let i = 0; i + lag < n; i++) score += envelope[i] * envelope[i + lag]
    if (score > bestScore) { bestScore = score; bestLag = lag }
  }

  let bpm = 60 / (bestLag * 0.01)
  while (bpm < 80)  bpm *= 2
  while (bpm > 160) bpm /= 2
  return Math.round(bpm * 10) / 10
}

// ─── Key: chromagram via radix-2 FFT + Krumhansl-Schmuckler ───────────────

const MAJOR = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
const MINOR = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function detectKey(mono: Float32Array, sr: number): { key: string; scale: string } {
  const fftSize  = 4096
  const hopSamp  = Math.round(sr * 0.5)
  const chroma   = new Float32Array(12)
  let frames = 0

  for (let offset = 0; offset + fftSize < mono.length; offset += hopSamp) {
    const frame = new Float32Array(fftSize)
    for (let i = 0; i < fftSize; i++) {
      frame[i] = (mono[offset + i] ?? 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1)))
    }
    const mag = fftMagnitude(frame)  // O(n log n)
    const binHz = sr / fftSize
    for (let k = 1; k < mag.length; k++) {
      const hz = k * binHz
      if (hz < 80 || hz > 4000) continue
      const midi = 12 * Math.log2(hz / 440) + 69
      const pc   = ((Math.round(midi) % 12) + 12) % 12
      chroma[pc] += mag[k]
    }
    frames++
  }
  if (!frames) return { key: 'C', scale: 'major' }

  const peak = Math.max(...Array.from(chroma)) || 1
  for (let i = 0; i < 12; i++) chroma[i] /= peak

  let bestKey = 0, bestScale: 'major'|'minor' = 'major', bestCorr = -Infinity
  for (let r = 0; r < 12; r++) {
    const maj = pearson(chroma, rotate(MAJOR, r))
    const min = pearson(chroma, rotate(MINOR, r))
    if (maj > bestCorr) { bestCorr = maj; bestKey = r; bestScale = 'major' }
    if (min > bestCorr) { bestCorr = min; bestKey = r; bestScale = 'minor' }
  }
  return { key: NOTES[bestKey], scale: bestScale }
}

// Cooley-Tukey in-place radix-2 FFT, returns magnitude spectrum
function fftMagnitude(real: Float32Array): Float32Array {
  const n = real.length
  const re = Float64Array.from(real)
  const im = new Float64Array(n)

  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }

  // FFT butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len
    const wRe = Math.cos(ang), wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let uRe = 1, uIm = 0
      for (let k = 0; k < len / 2; k++) {
        const evenRe = re[i+k],       evenIm = im[i+k]
        const oddRe  = re[i+k+len/2], oddIm  = im[i+k+len/2]
        const tRe = uRe*oddRe - uIm*oddIm
        const tIm = uRe*oddIm + uIm*oddRe
        re[i+k]       = evenRe + tRe; im[i+k]       = evenIm + tIm
        re[i+k+len/2] = evenRe - tRe; im[i+k+len/2] = evenIm - tIm
        const newURe = uRe*wRe - uIm*wIm
        uIm = uRe*wIm + uIm*wRe; uRe = newURe
      }
    }
  }

  const mag = new Float32Array(n / 2)
  for (let i = 0; i < n / 2; i++) mag[i] = Math.sqrt(re[i]**2 + im[i]**2)
  return mag
}

function rotate(p: number[], s: number): number[] {
  return [...p.slice(s), ...p.slice(0, s)]
}

function pearson(a: Float32Array, b: number[]): number {
  const n = a.length
  const mA = a.reduce((s,v) => s+v, 0) / n
  const mB = b.reduce((s,v) => s+v, 0) / n
  let num = 0, dA = 0, dB = 0
  for (let i = 0; i < n; i++) {
    const ai = a[i]-mA, bi = b[i]-mB
    num += ai*bi; dA += ai*ai; dB += bi*bi
  }
  return num / (Math.sqrt(dA*dB) || 1)
}
