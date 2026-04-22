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

export type Annotation = {
  id: string
  type: 'vertical' | 'horizontal' | 'label'
  position: number       // seconds (vertical) | amplitude 0-1 (horizontal)
  label: string
  color: string
}

export type BeatGridGranularity = '1' | '1/2' | '1/4' | '1/8' | '1/16'

type Settings = {
  shortcuts: Record<string, string>
}

type TrackStore = {
  stems: Stem[]
  annotations: Annotation[]
  playheadTime: number
  isPlaying: boolean
  zoomH: number
  zoomV: number
  bpmOverride: number | null
  granularity: BeatGridGranularity
  settings: Settings
  analysing: boolean

  addStem: (stem: Stem) => void
  removeStem: (id: string) => void
  updateStem: (id: string, patch: Partial<Stem>) => void
  clearStems: () => void

  addAnnotation: (ann: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void

  setPlayheadTime: (t: number) => void
  setPlaying: (v: boolean) => void
  setZoomH: (v: number) => void
  setZoomV: (v: number) => void
  setBpmOverride: (v: number | null) => void
  setGranularity: (g: BeatGridGranularity) => void
  updateSettings: (patch: Partial<Settings>) => void
  setAnalysing: (v: boolean) => void
}

const STEM_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

export const useTrackStore = create<TrackStore>()(
  persist(
    (set) => ({
      stems: [],
      annotations: [],
      playheadTime: 0,
      isPlaying: false,
      zoomH: 1,
      zoomV: 1,
      bpmOverride: null,
      granularity: '1/4',
      analysing: false,
      settings: {
        shortcuts: {
          'play-pause': 'Space',
          'stop': 'Escape',
          'add-marker': 'm',
          'add-hline': 'shift+m',
          'zoom-in': '=',
          'zoom-out': '-',
          'next-beat': 'ArrowRight',
          'prev-beat': 'ArrowLeft',
          'export': 'ctrl+e',
          'settings': 'ctrl+comma',
        },
      },

      addStem: (stem) =>
        set((s) => ({
          stems: [
            ...s.stems,
            { ...stem, color: STEM_COLORS[s.stems.length % STEM_COLORS.length] },
          ],
        })),
      removeStem: (id) =>
        set((s) => ({ stems: s.stems.filter((t) => t.id !== id) })),
      updateStem: (id, patch) =>
        set((s) => ({ stems: s.stems.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      clearStems: () => set({ stems: [] }),

      addAnnotation: (ann) => set((s) => ({ annotations: [...s.annotations, ann] })),
      updateAnnotation: (id, patch) =>
        set((s) => ({
          annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAnnotation: (id) =>
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

      setPlayheadTime: (t) => set({ playheadTime: t }),
      setPlaying: (v) => set({ isPlaying: v }),
      setZoomH: (v) => set({ zoomH: Math.max(1, Math.min(100, v)) }),
      setZoomV: (v) => set({ zoomV: Math.max(0.5, Math.min(4, v)) }),
      setBpmOverride: (v) => set({ bpmOverride: v }),
      setGranularity: (g) => set({ granularity: g }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setAnalysing: (v) => set({ analysing: v }),
    }),
    {
      name: 'tracklab-store',
      partialize: (s) => ({
        annotations: s.annotations,
        bpmOverride: s.bpmOverride,
        granularity: s.granularity,
        settings: s.settings,
        zoomH: s.zoomH,
        zoomV: s.zoomV,
      }),
    }
  )
)
