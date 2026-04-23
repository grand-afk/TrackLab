import { useEffect, useRef } from 'react'
import { tinykeys } from 'tinykeys'
import { useTrackStore } from '../store/useTrackStore'

type Handler = () => void
type ActionMap = Partial<Record<string, Handler>>

// tinykeys uses $mod (Ctrl on Win, Cmd on Mac) and title-cased modifier names.
// Normalize old persisted lowercase values so bindings still fire after upgrades.
function normShortcut(key: string): string {
  return key
    .replace(/\bctrl\b/gi, '$mod')
    .replace(/\bshift\b/gi, 'Shift')
    .replace(/\balt\b/gi, 'Alt')
    .replace(/\bmeta\b/gi, 'Meta')
}

export function useKeyBindings(actions: ActionMap) {
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const bindings: Record<string, (e: KeyboardEvent) => void> = {}
    for (const action of Object.keys(actionsRef.current)) {
      const key = shortcuts[action]
      if (key) bindings[normShortcut(key)] = (e: KeyboardEvent) => {
        e.preventDefault()
        actionsRef.current[action]?.()
      }
    }
    return tinykeys(window, bindings)
  }, [shortcuts])
}
