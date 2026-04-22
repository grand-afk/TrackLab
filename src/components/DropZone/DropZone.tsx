import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../../lib/utils'

type Props = {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']

export function DropZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false)

  const handle = useCallback((files: FileList | null) => {
    if (!files) return
    const audio = Array.from(files).filter(
      (f) => AUDIO_TYPES.includes(f.type) || f.name.match(/\.(mp3|wav|flac|aac|ogg|m4a|aiff)$/i)
    )
    if (audio.length) onFiles(audio)
  }, [onFiles])

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors select-none',
        dragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files) }}
    >
      <input
        type="file"
        accept="audio/*"
        multiple
        className="sr-only"
        onChange={(e) => handle(e.target.files)}
        disabled={disabled}
      />
      <Upload className={cn('w-8 h-8', dragging ? 'text-indigo-400' : 'text-zinc-500')} />
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">Drop audio files here</p>
        <p className="text-xs text-zinc-500 mt-1">MP3, WAV, FLAC, AAC, M4A · up to 6 stems</p>
      </div>
    </label>
  )
}
