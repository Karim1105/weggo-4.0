import fs from 'fs/promises'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanupTicketAttachments } from '@/lib/tickets/attachments'

const attachmentPath = '/uploads/listings/test-user/ticket-123/attachment.png'
const fullAttachmentPath = path.join(process.cwd(), 'public', attachmentPath.slice(1))

afterEach(async () => {
  await fs.rm(path.join(process.cwd(), 'public', 'uploads', 'listings', 'test-user'), {
    recursive: true,
    force: true,
  })
})

describe('ticket attachment cleanup', () => {
  it('removes uploaded attachment files from disk when asked to clean them up', async () => {
    await fs.mkdir(path.dirname(fullAttachmentPath), { recursive: true })
    await fs.writeFile(fullAttachmentPath, 'ticket-attachment')

    await cleanupTicketAttachments([attachmentPath])

    await expect(fs.access(fullAttachmentPath)).rejects.toBeTruthy()
  })
})
