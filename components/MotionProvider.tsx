'use client'

import { MotionConfig } from 'framer-motion'

export default function MotionProvider({
  children,
  nonce,
}: {
  children: React.ReactNode
  /** CSP nonce so framer-motion's injected <style> elements are allowed. */
  nonce?: string
}) {
  return (
    <MotionConfig nonce={nonce} reducedMotion="always" transition={{ duration: 0.16, ease: 'easeOut' }}>
      {children}
    </MotionConfig>
  )
}
