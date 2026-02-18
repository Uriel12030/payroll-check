'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { useWizard } from './WizardContext'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILES = 12
const MAX_SIZE_MB = 10

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step6Files() {
  const { data, updateData, goNext, goPrev } = useWizard()
  const [files, setFiles] = useState<File[]>(data.files ?? [])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    setError('')

    const valid: File[] = []
    for (const file of Array.from(newFiles)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('סוג קובץ לא נתמך. יש להעלות PDF, JPG או PNG בלבד.')
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`הקובץ ${file.name} גדול מדי. גודל מקסימלי: ${MAX_SIZE_MB}MB.`)
        return
      }
      valid.push(file)
    }

    const updated = [...files, ...valid].slice(0, MAX_FILES)
    setFiles(updated)
    updateData({ files: updated })
  }

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    updateData({ files: updated })
  }

  const handleNext = () => {
    goNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">העלאת מסמכים</h2>
        <p className="text-sm text-gray-500">
          העלו תלושי שכר, חוזה עבודה, מכתב פיטורים וכל מסמך רלוונטי אחר (לא חובה)
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          addFiles(e.dataTransfer.files)
        }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700">גררו קבצים לכאן או לחצו להעלאה</p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, JPG, PNG · עד {MAX_SIZE_MB}MB לקובץ · עד {MAX_FILES} קבצים
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100"
            >
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400">
            {files.length}/{MAX_FILES} קבצים
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={goPrev} className="btn-secondary flex-1">
          → חזור
        </button>
        <button type="button" onClick={handleNext} className="btn-primary flex-1">
          המשך ←
        </button>
      </div>
    </div>
  )
}
