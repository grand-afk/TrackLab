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
  stemId: string    // which stem this marker belongs to
  number: number    // 1–20 per stem
  time: number      // seconds
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
export type SkipUnit = 'seconds' | 'beats'

export type SkipSettings = {
  amount: number
  unit: SkipUnit
  fineAmount: number
  fineUnit: SkipUnit
}

type Settings = {
  shortcuts: Record<string, string>
  skip: SkipSettings
  timeSignatureTop: number     // numerator (e.g. 4, 3, 5, 7)
  timeSignatureBottom: number  // denominator (2, 4, 8, 16)
  subdivisionTicks: number     // ticks per denominator note: 2=1/8, 4=1/16, 8=1/32
}

type TrackStore = {
  stems: Stem[]
  focusedStemId: string | null
  cueMarkers: CueMarker[]
  selectedMarkerId: string | null
  annotations: Annotation[]
  playheadTime: number
  isPlaying: boolean
  currentPps: number
  scrollStartTime: number
  containerWidth: number
  zoomH: number
  bpmOverride: number | null
  granularity: BeatGridGranularity
  settings: Settings

  addStem: (stem: Stem) => void
  removeStem: (id: string) => void
  updateStem: (id: string, patch: Partial<Stem>) => void
  setFocusedStemId: (id: string | null) => void

  addCueMarker: (marker: CueMarker) => void
  updateCueMarker: (id: string, patch: Partial<CueMarker>) => void
  removeCueMarker: (id: string) => void
  clearCueMarkers: (stemId?: string) => void
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
  setBpmOverride: (v: number | null) => void
  setGranularity: (g: BeatGridGranularity) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateSkipSettings: (patch: Partial<SkipSettings>) => void
}

const STEM_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4']
export const STEM_LETTERS = ['A','B','C','D','E','F']

export const MARKER_COLORS = [
  '#f59e0b','#ef4444','#10b981','#6366f1','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6',
  '#a78bfa','#fb923c','#34d399','#60a5fa','#f472b6',
  '#facc15','#4ade80','#38bdf8','#c084fc','#fb7185',
]

const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    'play-pause':    'Space',
    'stop':          'Escape',
    'skip-start':    'Home',
    'zoom-in':       '=',
    'zoom-out':      '-',
    'goto':          'g',
    'settings':      '$mod+,',
    'export':        '$mod+e',
    'clear-markers': '$mod+Shift+m',
    'edit-label':    'F2',
  },
  skip: {
    amount: 5, unit: 'seconds',
    fineAmount: 0.5, fineUnit: 'seconds',
  },
  timeSignatureTop: 4,
  timeSignatureBottom: 4,
  subdivisionTicks: 4,  // 1/16 note resolution by default
}

type StoreImpl = TrackStore & { getState: () => TrackStore }

export const useTrackStore = create<TrackStore>()(
  persist(
    (set) => ({
      stems: [], focusedStemId: null,
      cueMarkers: [], selectedMarkerId: null, annotations: [],
      playheadTime: 0, isPlaying: false,
      currentPps: 0, scrollStartTime: 0, containerWidth: 0,
      zoomH: 1, bpmOverride: null, granularity: '1/4' as BeatGridGranularity,
      settings: DEFAULT_SETTINGS,

      addStem: (stem: Stem) =>
        set((s) => ({
          stems: [...s.stems, { ...stem, color: STEM_COLORS[s.stems.length % STEM_COLORS.length] }],
          focusedStemId: s.focusedStemId ?? stem.id,
        })),
      removeStem: (id: string) =>
        set((s) => ({
          stems: s.stems.filter((t) => t.id !== id),
          focusedStemId: s.focusedStemId === id
            ? (s.stems.find((t) => t.id !== id)?.id ?? null)
            : s.focusedStemId,
          cueMarkers: s.cueMarkers.filter((m) => m.stemId !== id),
        })),
      updateStem: (id: string, patch: Partial<Stem>) =>
        set((s) => ({ stems: s.stems.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      setFocusedStemId: (id: string | null) => set({ selectedMarkerId: null, focusedStemId: id }),

      addCueMarker: (marker: CueMarker) =>
        set((s) => ({
          cueMarkers: [
            ...s.cueMarkers.filter((m) => !(m.stemId === marker.stemId && m.number === marker.number)),
            marker,
          ].sort((a, b) => a.time - b.time),
        })),
      updateCueMarker: (id: string, patch: Partial<CueMarker>) =>
        set((s) => ({
          cueMarkers: s.cueMarkers
            .map((m) => (m.id === id ? { ...m, ...patch } : m))
            .sort((a, b) => a.time - b.time),
        })),
      removeCueMarker: (id: string) =>
        set((s) => ({ cueMarkers: s.cueMarkers.filter((m) => m.id !== id) })),
      clearCueMarkers: (stemId?: string) =>
        set((s) => ({
          cueMarkers: stemId ? s.cueMarkers.filter((m) => m.stemId !== stemId) : [],
          selectedMarkerId: null,
        })),
      setSelectedMarkerId: (id: string | null) => set({ selectedMarkerId: id }),

      addAnnotation: (ann: Annotation) => set((s) => ({ annotations: [...s.annotations, ann] })),
      updateAnnotation: (id: string, patch: Partial<Annotation>) =>
        set((s) => ({ annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAnnotation: (id: string) =>
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

      setPlayheadTime: (t: number) => set({ playheadTime: t }),
      setPlaying: (v: boolean) => set({ isPlaying: v }),
      setCurrentPps: (pps: number) => set({ currentPps: pps }),
      setScrollStartTime: (t: number) => set({ scrollStartTime: t }),
      setContainerWidth: (w: number) => set({ containerWidth: w }),
      setZoomH: (v: number) => set({ zoomH: Math.max(1, Math.min(50, v)) }),
      setBpmOverride: (v: number | null) => set({ bpmOverride: v }),
      setGranularity: (g: BeatGridGranularity) => set({ granularity: g }),
      updateSettings: (patch: Partial<Settings>) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateSkipSettings: (patch: Partial<SkipSettings>) =>
        set((s) => ({ settings: { ...s.settings, skip: { ...s.settings.skip, ...patch } } })),
    } satisfies TrackStore),
    {
      name: 'tracklab-store',
      version: 2,
      migrate: (state: unknown, version: number) => {
        if (version < 2) {
          return { ...(state as object), cueMarkers: [] }
        }
        return state
      },
      // Deep-merge shortcuts so newly added default shortcuts appear in old persisted states
      merge: (persistedState: unknown, currentState: TrackStore): TrackStore => {
        const ps = persistedState as Partial<TrackStore>
        return {
          ...currentState,
          ...ps,
          settings: {
            ...currentState.settings,
            ...(ps.settings ?? {}),
            shortcuts: {
              ...currentState.settings.shortcuts,  // all defaults
              ...(ps.settings?.shortcuts ?? {}),   // user overrides
            },
          },
        }
      },
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

// Suppress unused variable warning for StoreImpl
void (0 as unknown as StoreImpl)

// Helper — beat-aware skip, accessed via getState() cast
export function getSkipSeconds(fine: boolean): number {
  const { settings, stems, bpmOverride } = useTrackStore.getState()
  const sk = fine
    ? { amount: settings.skip.fineAmount, unit: settings.skip.fineUnit }
    : { amount: settings.skip.amount,     unit: settings.skip.unit }
  if (sk.unit === 'beats') {
    const bpm = bpmOverride ?? stems[0]?.bpm ?? 120
    return (60 / bpm) * sk.amount
  }
  return sk.amount
}

// Helper — bars:beats:ticks from seconds
export function fmtBarsBeats(seconds: number, bpm: number, timeSigTop: number, timeSigBottom: number, subdivTicks: number): string {
  if (!bpm) return '---:--:--'
  const beatDur = 60 / bpm                          // quarter note duration
  const noteDur = beatDur * (4 / timeSigBottom)     // denominator note duration
  const barDur  = timeSigTop * noteDur
  const tickDur = noteDur / subdivTicks

  const bar   = Math.floor(seconds / barDur) + 1
  const beat  = Math.floor((seconds % barDur) / noteDur) + 1
  const tick  = Math.floor((seconds % noteDur) / tickDur)

  return `${String(bar).padStart(3,'0')}:${String(beat).padStart(2,'0')}:${String(tick).padStart(2,'0')}`
}

// Helper — HH:MM:SS
export function fmtHHMMSS(seconds: number): string {
  const h  = Math.floor(seconds / 3600)
  const m  = Math.floor((seconds % 3600) / 60)
  const s  = Math.floor(seconds % 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
