'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Ban, Package, TrendingUp, Users } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { KpiCard } from '@/components/admin/KpiCard'
import { getAnalytics } from '@/features/admin/services/admin-api'
import { AnalyticsPayload } from '@/features/admin/types'

interface OverviewModuleProps {
  refreshTick: number
}

export default function OverviewModule({ refreshTick }: OverviewModuleProps) {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const analytics = await getAnalytics(refreshTick)
        if (mounted) setData(analytics)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [refreshTick])

  const usersByDay = useMemo(
    () => data?.trends.usersByDay.map((item) => ({ date: item._id, users: item.count })) || [],
    [data]
  )
  const listingsByDay = useMemo(
    () => data?.trends.productsByDay.map((item) => ({ date: item._id, listings: item.count })) || [],
    [data]
  )

  if (loading) return <LoadingState label="Loading analytics..." />
  if (error) return <ErrorState message={error} />
  if (!data) return <ErrorState message="Analytics data is unavailable." />

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total users" value={data.overview.totalUsers} icon={Users} />
        <KpiCard title="Active listings" value={data.overview.activeProducts} icon={Package} />
        <KpiCard title="Pending reports" value={data.overview.pendingReports} icon={TrendingUp} />
        <KpiCard title="Banned users" value={data.overview.bannedUsers} icon={Ban} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">User growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={usersByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Listings growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={listingsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="listings" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
