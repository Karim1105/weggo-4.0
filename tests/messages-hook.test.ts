import { describe, expect, it } from 'vitest'
import { shouldFetchCurrentUser } from '@/app/messages/hooks/useMessages'

describe('useMessages helpers', () => {
  it('fetches current user on initial replace when missing', () => {
    expect(shouldFetchCurrentUser('replace', null)).toBe(true)
  })

  it('does not fetch current user on append pagination', () => {
    expect(shouldFetchCurrentUser('append', null)).toBe(false)
  })

  it('does not refetch current user when already known', () => {
    expect(shouldFetchCurrentUser('replace', 'user-1')).toBe(false)
  })
})
