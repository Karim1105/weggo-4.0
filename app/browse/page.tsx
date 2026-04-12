'use client'

import { Suspense } from 'react'
import BrowsePageContainer from '@/app/browse/components/BrowsePageContainer'

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowsePageContainer />
    </Suspense>
  )
}

