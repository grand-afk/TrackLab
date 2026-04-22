import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}

export function noteFromKey(key: string): string {
  const map: Record<string, string> = {
    'C': 'C', 'C#': 'C#', 'Db': 'Db', 'D': 'D', 'D#': 'D#',
    'Eb': 'Eb', 'E': 'E', 'F': 'F', 'F#': 'F#', 'Gb': 'Gb',
    'G': 'G', 'G#': 'G#', 'Ab': 'Ab', 'A': 'A', 'A#': 'A#',
    'Bb': 'Bb', 'B': 'B',
  }
  return map[key] ?? key
}
