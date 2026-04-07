'use client'

import { MotionConfig } from 'framer-motion'

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="always" transition={{ duration: 0.16, ease: 'easeOut' }}>
      {children}
    </MotionConfig>
  )
}
