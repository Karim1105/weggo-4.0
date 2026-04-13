'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Ban, ShieldCheck } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { banUser, getUsers, unbanUser } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminNotification, AdminUser, PaginationMeta } from '@/features/admin/types'
import { formatDate } from '@/lib/utils'

interface UsersModuleProps {
  refreshTick: number
  onActivity: (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void
  onNotify: (entry: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
}

interface FilterFormValues {
  search: string
  status: 'all' | 'banned' | 'verified'
}

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
}

export default function UsersModule({ refreshTick, onActivity, onNotify }: UsersModuleProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedBanUserId, setSelectedBanUserId] = useState<string | null>(null)

  const filtersForm = useForm<FilterFormValues>({ defaultValues: { search: '', status: 'all' } })
  const banReasonForm = useForm<{ reason: string }>({ defaultValues: { reason: '' } })

  const [appliedFilters, setAppliedFilters] = useState<FilterFormValues>({ search: '', status: 'all' })

  const loadUsers = async (page = 1, nextFilters = appliedFilters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUsers({ page, limit: 10, search: nextFilters.search, status: nextFilters.status, refreshTick })
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  const canSubmitBanReason = useMemo(() => Boolean(banReasonForm.watch('reason')?.trim()), [banReasonForm])

  const applyFilters = filtersForm.handleSubmit((values) => {
    setAppliedFilters(values)
    loadUsers(1, values)
  })

  const handleUnban = async (userId: string) => {
    setLoadingAction(userId)
    try {
      await unbanUser(userId)
      toast.success('User unbanned successfully')
      onNotify({ title: 'User unbanned', message: `User ${userId} was restored.` })
      onActivity({ action: 'UNBAN_USER', details: `Unbanned user ${userId}`, actor: 'Admin' })
      await loadUsers(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unban user')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBan = banReasonForm.handleSubmit(async ({ reason }) => {
    if (!selectedBanUserId) return
    setLoadingAction(selectedBanUserId)
    try {
      await banUser(selectedBanUserId, reason)
      toast.success('User banned successfully')
      onNotify({ title: 'User banned', message: `User ${selectedBanUserId} was blocked.` })
      onActivity({ action: 'BAN_USER', details: `Banned user ${selectedBanUserId}`, actor: 'Admin' })
      setSelectedBanUserId(null)
      banReasonForm.reset({ reason: '' })
      await loadUsers(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to ban user')
    } finally {
      setLoadingAction(null)
    }
  })

  return (
    <div className="space-y-4">
      <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr,200px,120px]">
        <input
          type="search"
          {...filtersForm.register('search')}
          placeholder="Search users by name or email"
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <select {...filtersForm.register('status')} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All users</option>
          <option value="banned">Banned</option>
          <option value="verified">Verified sellers</option>
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Search
        </button>
      </form>

      {loading && <LoadingState label="Loading users..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && users.length === 0 && <EmptyState title="No users found" subtitle="Try changing filters." />}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="text-sm text-gray-700">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {user.banned && <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">Banned</span>}
                        {user.sellerVerified && (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">Verified</span>
                        )}
                        {!user.banned && !user.sellerVerified && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-gray-400">Protected</span>
                      ) : user.banned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          disabled={loadingAction === user.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedBanUserId(user.id)}
                          disabled={loadingAction === user.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={(page) => loadUsers(page)}
          />
        </div>
      )}

      {selectedBanUserId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Ban user</h3>
            <p className="mt-1 text-xs text-gray-500">A reason is required and will be persisted for auditability.</p>
            <form onSubmit={handleBan} className="mt-4 space-y-3">
              <textarea
                rows={4}
                {...banReasonForm.register('reason', { required: true, minLength: 4 })}
                placeholder="Reason for banning this account"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBanUserId(null)
                    banReasonForm.reset({ reason: '' })
                  }}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitBanReason}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Confirm ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
