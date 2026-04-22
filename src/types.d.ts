declare module 'tinykeys' {
  type KeyBindingMap = Record<string, (e: KeyboardEvent) => void>
  export function tinykeys(target: Window | HTMLElement, keyBindingMap: KeyBindingMap): () => void
}
