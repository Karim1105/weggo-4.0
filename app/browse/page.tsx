import { Suspense } from 'react'
import { cookies } from 'next/headers'
import BrowsePageContainer from '@/app/browse/components/BrowsePageContainer'
import { getServerViewerRole } from '@/lib/auth'

export default async function BrowsePage() {
  const role = await getServerViewerRole()
  const cookieStore = await cookies()
  const adminViewPreference = cookieStore.get('adminView')?.value
  const isAdmin = role === 'admin'
  const initialViewEnabled = isAdmin ? adminViewPreference !== 'off' : false

  return (
    <Suspense fallback={null}>
      <BrowsePageContainer
        adminState={{
          isAdmin,
          role,
          initialViewEnabled,
        }}
      />
    </Suspense>
  )
}

