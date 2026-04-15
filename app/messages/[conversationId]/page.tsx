import { Types } from 'mongoose'
import { redirect } from 'next/navigation'
import { getServerAuthUser } from '@/lib/auth'
import { getConversationMessages } from '@/app/api/messages/services/message.service'
import ConversationClient from '@/app/messages/[conversationId]/ConversationClient'

type PageProps = {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params
  const user = await getServerAuthUser()

  if (!user?._id) {
    redirect(`/login?redirect=/messages/${encodeURIComponent(conversationId)}`)
  }

  if ((user as any).banned) {
    redirect('/')
  }

  const result = await getConversationMessages({
    conversationId,
    userId: new Types.ObjectId(user._id.toString()),
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
      currentUserId={user._id.toString()}
    />
  )
}
