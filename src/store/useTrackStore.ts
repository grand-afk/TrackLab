import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Stem = {
  id: string
  name: string
  file: File
  url: string
  bpm: number | null
  key: string | null
  scale: string | null
  duration: number
  color: string
  muted: boolean
  solo: boolean
}

export type CueMarker = {
  id: string
  number: number      // 1–20
  time: number        // seconds
  label: string
  color: string
}

export type Annotation = {
  id: string
  type: 'vertical' | 'horizontal' | 'label'
  position: number
  label: string
  color: string
}

export type BeatGridGranularity = '1' | '1/2' | '1/4' | '1/8' | '1/16'

type Settings = {
  shortcuts: Record<string, string>
}

type TrackStore = {
  stems: Stem[]
  cueMarkers: CueMarker[]
  selectedMarkerId: string | null
  annotations: Annotation[]
  playheadTime: number
  isPlaying: boolean
  // Waveform zoom/scroll state (written by Waveform, read by BeatGrid)
  currentPps: number
  scrollStartTime: number
  containerWidth: number
  zoomH: number           // kept for keyboard zoom shortcuts
  zoomV: number
  bpmOverride: number | null
  granularity: BeatGridGranularity
  settings: Settings

  addStem: (stem: Stem) => void
  removeStem: (id: string) => void
  updateStem: (id: string, patch: Partial<Stem>) => void
  clearStems: () => void

  addCueMarker: (marker: CueMarker) => void
  updateCueMarker: (id: string, patch: Partial<CueMarker>) => void
  removeCueMarker: (id: string) => void
  setSelectedMarkerId: (id: string | null) => void

  addAnnotation: (ann: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void

  setPlayheadTime: (t: number) => void
  setPlaying: (v: boolean) => void
  setCurrentPps: (pps: number) => void
  setScrollStartTime: (t: number) => void
  setContainerWidth: (w: number) => void
  setZoomH: (v: number) => void
  setZoomV: (v: number) => void
  setBpmOverride: (v: number | null) => void
  setGranularity: (g: BeatGridGranularity) => void
  updateSettings: (patch: Partial<Settings>) => void
}

const STEM_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

const MARKER_COLORS = [
  '#f59e0b','#ef4444','#10b981','#6366f1','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6',
  '#a78bfa','#fb923c','#34d399','#60a5fa','#f472b6',
  '#facc15','#4ade80','#38bdf8','#c084fc','#fb7185',
]

export const useTrackStore = create<TrackStore>()(
  persist(
    (set) => ({
      stems: [],
      cueMarkers: [],
      selectedMarkerId: null,
      annotations: [],
      playheadTime: 0,
      isPlaying: false,
      currentPps: 0,
      scrollStartTime: 0,
      containerWidth: 0,
      zoomH: 1,
      zoomV: 1,
      bpmOverride: null,
      granularity: '1/4',
      settings: {
        shortcuts: {
          'play-pause': 'Space',
          'stop': 'Escape',
          'zoom-in': '=',
          'zoom-out': '-',
          'skip-start': 'Home',
          'skip-back': 'ArrowLeft',
          'skip-forward': 'ArrowRight',
          'goto': 'g',
          'settings': 'ctrl+comma',
          'export': 'ctrl+e',
          'nudge-left': 'ArrowLeft',
          'nudge-right': 'ArrowRight',
        },
      },

      addStem: (stem) =>
        set((s) => ({
          stems: [...s.stems, { ...stem, color: STEM_COLORS[s.stems.length % STEM_COLORS.length] }],
        })),
      removeStem: (id) => set((s) => ({ stems: s.stems.filter((t) => t.id !== id) })),
      updateStem: (id, patch) =>
        set((s) => ({ stems: s.stems.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      clearStems: () => set({ stems: [] }),

      addCueMarker: (marker) =>
        set((s) => ({ cueMarkers: [...s.cueMarkers.filter((m) => m.number !== marker.number), marker] })),
      updateCueMarker: (id, patch) =>
        set((s) => ({ cueMarkers: s.cueMarkers.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeCueMarker: (id) =>
        set((s) => ({ cueMarkers: s.cueMarkers.filter((m) => m.id !== id) })),
      setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),

      addAnnotation: (ann) => set((s) => ({ annotations: [...s.annotations, ann] })),
      updateAnnotation: (id, patch) =>
        set((s) => ({ annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAnnotation: (id) =>
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

      setPlayheadTime: (t) => set({ playheadTime: t }),
      setPlaying: (v) => set({ isPlaying: v }),
      setCurrentPps: (pps) => set({ currentPps: pps }),
      setScrollStartTime: (t) => set({ scrollStartTime: t }),
      setContainerWidth: (w) => set({ containerWidth: w }),
      setZoomH: (v) => set({ zoomH: Math.max(1, Math.min(50, v)) }),
      setZoomV: (v) => set({ zoomV: Math.max(0.5, Math.min(4, v)) }),
      setBpmOverride: (v) => set({ bpmOverride: v }),
      setGranularity: (g) => set({ granularity: g }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'tracklab-store',
      partialize: (s) => ({
        cueMarkers: s.cueMarkers,
        annotations: s.annotations,
        bpmOverride: s.bpmOverride,
        granularity: s.granularity,
        settings: s.settings,
      }),
    }
  )
)

export { MARKER_COLORS }
