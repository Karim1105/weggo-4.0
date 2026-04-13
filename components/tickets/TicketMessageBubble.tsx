import { listingImageUrl } from '@/lib/utils'

interface TicketMessageBubbleProps {
  mine: boolean
  senderLabel: string
  message: string
  createdAt: string
  attachments: string[]
}

export default function TicketMessageBubble({ mine, senderLabel, message, createdAt, attachments }: TicketMessageBubbleProps) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>
        <p className={`mb-1 text-[11px] font-semibold ${mine ? 'text-indigo-100' : 'text-gray-500'}`}>{senderLabel}</p>
        <p className="whitespace-pre-wrap text-sm">{message}</p>

        {attachments.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {attachments.map((attachment) => (
              <a key={attachment} href={listingImageUrl(attachment)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border bg-black/5">
                <img src={listingImageUrl(attachment)} alt="attachment" className="h-24 w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        <p className={`mt-2 text-[10px] ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
