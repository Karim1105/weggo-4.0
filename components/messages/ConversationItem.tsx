'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, MapPin, User } from 'lucide-react'
import type { ConversationDTO } from '@/types/messages'
import { formatMessage } from '@/app/messages/utils/formatMessage'

interface ConversationItemProps {
  conversation: ConversationDTO
  currentUserId: string | null
  onOpen: (conversationId: string) => void
}

export default function ConversationItem({ conversation, currentUserId, onOpen }: ConversationItemProps) {
  if (!conversation.lastMessage) return null

  const formatted = formatMessage(conversation.lastMessage, currentUserId)

  return (
    <Link href={`/messages/${encodeURIComponent(conversation.conversationId)}`}>
      <motion.div
        whileHover={{ scale: 1.01, y: -1 }}
        onClick={() => onOpen(conversation.conversationId)}
        className={`card-modern p-4 flex gap-4 items-center ${
          conversation.unreadCount > 0 ? 'border-primary-200 bg-primary-50/40' : ''
        }`}
      >
        {formatted.imageUrl ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={formatted.imageUrl}
              alt={formatted.productTitle || 'Item'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="truncate">{formatted.otherUserName}</span>
              {formatted.otherUserBanned && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                  BANNED
                </span>
              )}
            </p>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatted.timeLabel}
            </span>
          </div>

          {formatted.productTitle && typeof formatted.productPrice === 'number' && (
            <p className="text-xs text-gray-500 mb-1 truncate">
              Item: {formatted.productTitle} — {formatted.productPrice.toLocaleString()} EGP
            </p>
          )}

          <p
            className={`text-sm truncate ${
              conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            {formatted.preview}
          </p>
        </div>

        {conversation.unreadCount > 0 && (
          <span className="ml-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold flex-shrink-0">
            {conversation.unreadCount}
          </span>
        )}
      </motion.div>
    </Link>
  )
}
