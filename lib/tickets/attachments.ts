import { saveImage } from '@/lib/imageUpload'

const MAX_ATTACHMENTS_PER_MESSAGE = 4

export async function saveTicketAttachments(formData: FormData, userId: string, ticketId?: string) {
  const files = formData.getAll('attachments').filter((entry): entry is File => entry instanceof File)
  if (files.length === 0) return []

  if (files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`)
  }

  const saved: string[] = []
  for (const file of files) {
    if (!file.size) continue
    const path = await saveImage(file, userId, ticketId ? `ticket-${ticketId}` : 'tickets')
    saved.push(path)
  }

  return saved
}
