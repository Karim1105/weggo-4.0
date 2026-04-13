import { mapApiListingToProduct } from '@/lib/utils'

export type RawListingLike = Parameters<typeof mapApiListingToProduct>[0]

export function buildSimilarCards(rawListings: RawListingLike[], currentListingId: string, favoriteIds: Set<string>) {
  return rawListings
    .filter((item) => item._id !== currentListingId)
    .slice(0, 4)
    .map((item) => mapApiListingToProduct(item, favoriteIds))
}
