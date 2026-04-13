'use client'

import { useState } from 'react'

interface TicketComposerProps {
  loading: boolean
  disabled?: boolean
  onSubmit: (payload: { message: string; attachments: File[] }) => Promise<void>
  placeholder?: string
  submitLabel?: string
}

export default function TicketComposer({
  loading,
  disabled = false,
  onSubmit,
  placeholder = 'Write your message...',
  submitLabel = 'Send',
}: TicketComposerProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (!message.trim() || disabled) return
        await onSubmit({ message: message.trim(), attachments: files })
        setMessage('')
        setFiles([])
      }}
      className="space-y-3 rounded-xl border bg-white p-3"
    >
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        rows={3}
        disabled={disabled}
      />

      <input
        type="file"
        multiple
        accept="image/*"
        disabled={disabled}
        onChange={(event) => setFiles(Array.from(event.target.files || []))}
        className="block w-full text-xs text-gray-600"
      />

      {files.length > 0 && <p className="text-xs text-gray-500">{files.length} attachment(s) selected</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || disabled || !message.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Sending...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
