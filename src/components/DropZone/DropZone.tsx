import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../../lib/utils'

type Props = {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

function filterAudio(files: FileList | File[]): File[] {
  return Array.from(files).filter((f) =>
    /\.(mp3|wav|wave|flac|aac|ogg|m4a|aiff|aif)$/i.test(f.name) ||
    f.type.startsWith('audio/')
  )
}

export function DropZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Prevent the browser from navigating when a file is dropped anywhere on the page
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (disabled) return
    const audio = filterAudio(e.dataTransfer.files)
    if (audio.length) onFiles(audio)
  }, [onFiles, disabled])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const audio = filterAudio(e.target.files)
    if (audio.length) onFiles(audio)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }, [onFiles])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop audio files here or click to browse"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={(e) => {
        // Only clear if leaving the drop zone entirely (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors select-none cursor-pointer outline-none',
        'focus-visible:ring-2 focus-visible:ring-indigo-500',
        dragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />
      <Upload className={cn('w-8 h-8', dragging ? 'text-indigo-400' : 'text-zinc-500')} />
      <div className="text-center pointer-events-none">
        <p className="text-sm font-medium text-zinc-300">Drop audio files here</p>
        <p className="text-xs text-zinc-500 mt-1">or click to browse · MP3 WAV FLAC AAC M4A · up to 6 stems</p>
      </div>
    </div>
  )
}
