import { Types } from 'mongoose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getConversationMessages } from '@/app/api/messages/services/message.service'
import ConversationClient from '@/app/messages/[conversationId]/ConversationClient'

type PageProps = {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null

  if (!payload?.userId) {
    redirect(`/login?redirect=/messages/${encodeURIComponent(conversationId)}`)
  }

  const result = await getConversationMessages({
    conversationId,
    userId: new Types.ObjectId(payload.userId),
    limit: 30,
    page: 1,
    pageSize: 30,
  })

  return (
    <ConversationClient
      conversationId={conversationId}
      initialMessages={result.messages}
      initialCursor={result.pagination.cursor ?? null}
      initialHasMore={result.pagination.hasMore}
      currentUserId={payload.userId}
    />
  )
}
