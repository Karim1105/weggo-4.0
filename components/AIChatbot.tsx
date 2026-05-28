'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react'
import { formatChatbotReply, parseAiChatStreamEvent } from '@/lib/chatbot-client'
import type { AiChatRequestBody, ChatbotMessage, ChatbotRole } from '@/types/ai'

interface ChatbotAccessState {
  isLoggedIn: boolean
  isAdmin: boolean
  aiChatbotEnabled: boolean
  canUseAiChatbot: boolean
}

function createMessage(role: ChatbotRole, content: string): ChatbotMessage {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    id,
    role,
    content,
    timestamp: new Date(),
  }
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function AIChatbot() {
  const router = useRouter()
  const pathname = usePathname()
  const [access, setAccess] = useState<ChatbotAccessState | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    createMessage(
      'assistant',
      'Hello! I can help you browse Weggo listings or explain how the marketplace works. Try asking for phones, laptops, or furniture.'
    ),
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false
    fetch('/api/system/feature-flags', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.data) return
        setAccess(payload.data as ChatbotAccessState)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  const handleIconClick = () => {
    if (!access) return
    if (!access.isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
      return
    }
    if (!access.canUseAiChatbot) return
    setIsOpen((prev) => !prev)
  }

  // Hide entirely when disabled for the current viewer (not logged in admins
  // see the icon — login redirect is the intended UX), or when disabled by
  // an admin and the viewer is not an admin.
  if (access && access.isLoggedIn && !access.canUseAiChatbot) return null

  const sendMessage = async (rawMessage?: string) => {
    const messageText = (rawMessage ?? input).trim()
    if (!messageText || isLoading) return

    const userMessage = createMessage('user', messageText)
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const csrfToken = getCsrfToken()
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          message: messageText,
        } satisfies AiChatRequestBody),
      })

      if (!res.ok || !res.body) {
        throw new Error('The assistant stream could not be opened.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let replyText = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const line = part
            .split('\n')
            .find((candidate) => candidate.startsWith('data: '))

          if (!line) continue

          const event = parseAiChatStreamEvent(line.slice(6))
          if (!event) continue

          if (event.type === 'reply') {
            replyText = event.response
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        createMessage(
          'assistant',
          replyText
            ? formatChatbotReply(replyText)
            : 'I ran into an issue while searching. Please try again.'
        ),
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', 'I ran into an issue while searching. Please try again.'),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    'Show me phones',
    'Find laptops',
    'Furniture deals',
    'How does Weggo work?',
  ]

  return (
    <>
      <motion.button
        data-ai-chatbot="true"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleIconClick}
        className="fixed bottom-6 right-6 w-16 h-16 gradient-primary rounded-full shadow-2xl flex items-center justify-center z-50"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-ai-chatbot="true"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-96 max-w-[480px] h-[600px] card-modern z-50 flex flex-col overflow-hidden"
          >
            <div className="gradient-primary p-4 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Weggo Assistant</h3>
                  <p className="text-xs text-white/80">Marketplace search and help</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 p-3 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div className="p-3 border-t border-gray-200 bg-white">
                <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => void sendMessage(question)}
                      className="text-xs px-3 py-1.5 bg-primary-50 text-primary-600 rounded-full hover:bg-primary-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder="Ask about listings or Weggo..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
