import { useEffect } from 'react'
import { tinykeys } from 'tinykeys'
import { useTrackStore } from '../store/useTrackStore'

type Handler = () => void
type ActionMap = Partial<Record<string, Handler>>

export function useKeyBindings(actions: ActionMap) {
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)

  useEffect(() => {
    const bindings: Record<string, (e: KeyboardEvent) => void> = {}
    for (const [action, fn] of Object.entries(actions)) {
      if (!fn) continue
      const key = shortcuts[action]
      if (key) bindings[key] = (e: KeyboardEvent) => { e.preventDefault(); fn() }
    }
    return tinykeys(window, bindings)
  }, [shortcuts, actions])
}
