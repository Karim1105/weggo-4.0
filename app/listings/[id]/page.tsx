import { cookies } from 'next/headers'
import ListingDetailClient from './ListingDetailClient'
import { getServerViewerRole } from '@/lib/auth'

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params
  const role = await getServerViewerRole()
  const cookieStore = await cookies()
  const adminViewPreference = cookieStore.get('adminView')?.value

  const isAdmin = role === 'admin'
  const initialViewEnabled = isAdmin ? adminViewPreference !== 'off' : false

  return (
    <ListingDetailClient
      listingId={id}
      adminState={{
        isAdmin,
        role,
        initialViewEnabled,
      }}
    />
  )
}
