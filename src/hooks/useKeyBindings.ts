import { useEffect, useRef } from 'react'
import { tinykeys } from 'tinykeys'
import { useTrackStore } from '../store/useTrackStore'

type Handler = () => void
type ActionMap = Partial<Record<string, Handler>>

export function useKeyBindings(actions: ActionMap) {
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)
  // Keep a ref to the latest actions so tinykeys callbacks always call the current handler
  // without the effect needing to re-run (and re-register tinykeys) on every render.
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const bindings: Record<string, (e: KeyboardEvent) => void> = {}
    for (const action of Object.keys(actionsRef.current)) {
      const key = shortcuts[action]
      if (key) bindings[key] = (e: KeyboardEvent) => {
        e.preventDefault()
        actionsRef.current[action]?.()
      }
    }
    return tinykeys(window, bindings)
  }, [shortcuts]) // only re-register when shortcuts config changes, not on every render
}
