import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function useUserVerification() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Function to fetch user
  const fetchUser = useCallback(() => {
    setIsLoading(true)
    return fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user)
          return data.user
        } else {
          setUser(null)
          return null
        }
      })
      .catch(() => {
        setUser(null)
        return null
      })
      .finally(() => setIsLoading(false))
  }, [])

  // Fetch current user on mount
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleVerificationFlow = useCallback(async (redirectPath = '/sell') => {
    // Refresh user state first
    const currentUser = await fetchUser()
    
    // Check if user is logged in
    if (!currentUser) {
      toast.error('Please log in to continue')
      router.push('/login?redirect=/auth/upload-id')
      return
    }

    // Check if already verified
    if (currentUser.sellerVerified) {
      toast.success('You are already a verified seller!')
      router.push(redirectPath)
      return
    }

    // Redirect to ID upload
    router.push('/auth/upload-id')
  }, [fetchUser, router])

  return { user, isLoading, handleVerificationFlow, refreshUser: fetchUser }
}
