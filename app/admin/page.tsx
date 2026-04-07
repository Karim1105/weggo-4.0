'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  TrendingUp, Users, Package, Flag, BarChart3, 
  Ban, Check, X, Eye, Star, Zap, AlertTriangle, Search, ChevronDown, RotateCw,
  Trash2
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { withCsrfHeader, listingImageUrl } from '@/lib/utils'

type Tab = 'analytics' | 'users' | 'reports' | 'appeals' | 'listings'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics')
  
  // Data states
  const [analytics, setAnalytics] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])

  // UI states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics()
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'reports') fetchReports()
    if (activeTab === 'appeals') {
      // Ensure the appeals tab defaults to showing pending appeals
      setStatusFilter('pending')
      fetchAppeals(false, 'pending')
    }
    if (activeTab === 'listings') fetchSellers()
    // Intentionally refetch only on tab changes. Search/filter-driven reloads
    // are triggered by explicit UI actions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchAnalytics = async (bypassCache = false) => {
    try {
      const url = bypassCache ? `/api/admin/analytics?t=${Date.now()}` : '/api/admin/analytics'
      const res = await fetch(url, { 
        credentials: 'include',
        headers: bypassCache ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : undefined
      })
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      toast.error('Failed to load analytics')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (activeTab === 'analytics') await fetchAnalytics(true)
      else if (activeTab === 'users') await fetchUsers(true)
      else if (activeTab === 'reports') await fetchReports(true)
      else if (activeTab === 'appeals') await fetchAppeals(true)
      else if (activeTab === 'listings') await fetchSellers(true)
      toast.success('Data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchUsers = async (bypassCache = false) => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (bypassCache) params.set('t', Date.now().toString())

      const res = await fetch(`/api/admin/users?${params}`, { 
        credentials: 'include',
        headers: bypassCache ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : undefined
      })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
      }
    } catch (error) {
      toast.error('Failed to load users')
    }
  }

  const fetchReports = async (bypassCache = false) => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (bypassCache) params.set('t', Date.now().toString())

      const res = await fetch(`/api/admin/reports?${params}`, { 
        credentials: 'include',
        headers: bypassCache ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : undefined
      })
      const data = await res.json()
      if (data.success) {
        setReports(data.data.reports)
      }
    } catch (error) {
      toast.error('Failed to load reports')
    }
  }

  const fetchAppeals = async (bypassCache = false, status?: string) => {
    try {
      const params = new URLSearchParams()
      const filterStatus = status !== undefined ? status : statusFilter
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (bypassCache) params.set('t', Date.now().toString())

      const res = await fetch(`/api/admin/ban-appeals?${params}`, { 
        credentials: 'include',
        headers: bypassCache ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : undefined
      })
      const data = await res.json()
      if (data.success) {
        setAppeals(data.data.appeals)
      }
    } catch (error) {
      toast.error('Failed to load appeals')
    }
  }

  const fetchSellers = async (bypassCache = false) => {
    try {
      const url = bypassCache ? `/api/admin/sellers?t=${Date.now()}` : '/api/admin/sellers'
      const res = await fetch(url, { 
        credentials: 'include',
        headers: bypassCache ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : undefined
      })
      const data = await res.json()
      if (data.success) {
        setSellers(data.data?.sellers || [])
      }
    } catch (error) {
      toast.error('Failed to load sellers')
    }
  }

  const handleBanUser = async (userId: string, action: 'ban' | 'unban', reason?: string) => {
    if (action === 'ban' && !reason) {
      const userReason = prompt('Please provide a reason for banning this user:')
      if (!userReason) return
      reason = userReason
    }

    setLoadingAction(userId)
    try {
      const endpoint = action === 'ban' ? '/api/admin/ban-user' : '/api/admin/unban-user'
      const body: { userId: string; reason?: string } = { userId }

      if (action === 'ban' && reason) {
        body.reason = reason
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`)
        fetchUsers()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to update user')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleReportAction = async (reportId: string, action: string) => {
    let actionTaken = action
    if (action === 'warn-seller') {
      actionTaken = prompt('Describe the warning sent to seller:') || action
    }

    setLoadingAction(reportId)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action, actionTaken }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Report action completed')
        fetchReports()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to process report')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleAppealAction = async (appealId: string, action: 'approve' | 'reject') => {
    let rejectionReason = ''

    if (action === 'reject') {
      rejectionReason = prompt('Provide a reason for rejecting this appeal:') || ''
      if (!rejectionReason.trim()) {
        toast.error('Rejection reason is required')
        return
      }
    }

    setLoadingAction(appealId)
    try {
      const res = await fetch(`/api/admin/ban-appeals/${appealId}`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action, rejectionReason }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Appeal ${action}ed successfully`)
        fetchAppeals()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to process appeal')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBoostListing = async (listingId: string, action: 'boost' | 'unboost') => {
    setLoadingAction(listingId)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/boost`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Listing ${action}ed successfully`)
        fetchSellers()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to update listing')
    } finally {
      setLoadingAction(null)
    }
  }

  // Prepare chart data
  const userGrowthData = analytics?.trends?.usersByDay?.map((item: any) => ({
    date: item._id,
    users: item.count,
  })) || []

  const listingGrowthData = analytics?.trends?.productsByDay?.map((item: any) => ({
    date: item._id,
    listings: item.count,
  })) || []

  const categoryData = analytics?.topCategories?.map((item: any) => ({
    name: item._id,
    count: item.count,
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
              >
                <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Site
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 pb-4">
            {([
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'reports', label: 'Reports', icon: Flag },
              { id: 'appeals', label: 'Appeals', icon: AlertTriangle },
              { id: 'listings', label: 'Sellers', icon: Package },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: analytics.overview.totalUsers, icon: Users, color: 'blue' },
                { label: 'Active Listings', value: analytics.overview.activeProducts, icon: Package, color: 'green' },
                { label: 'Pending Reports', value: analytics.overview.pendingReports, icon: Flag, color: 'red' },
                { label: 'Banned Users', value: analytics.overview.bannedUsers, icon: Ban, color: 'orange' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-6 rounded-xl shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">{stat.label}</span>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4">User Growth (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Listing Growth */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Listing Growth (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={listingGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="listings" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Category Distribution */}
              <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Users</option>
                <option value="banned">Banned</option>
                <option value="verified">Verified Sellers</option>
              </select>
              <button
                onClick={() => fetchUsers()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.banned && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                              Banned
                            </span>
                          )}
                          {user.sellerVerified && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Verified
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleBanUser(user.id, user.banned ? 'unban' : 'ban')}
                            disabled={loadingAction === user.id}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              user.banned
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            } disabled:opacity-50`}
                          >
                            {user.banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <button
                onClick={() => fetchReports()}
                className="ml-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Refresh
              </button>
            </div>

            {/* Reports Grid */}
            <div className="grid gap-4">
              {reports.map((report) => (
                <div key={report._id} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{report.listing?.title || 'Deleted Listing'}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Reported by: {report.reporter?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      report.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4">{report.reason}</p>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReportAction(report._id, 'dismiss')}
                        disabled={loadingAction === report._id}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleReportAction(report._id, 'warn-seller')}
                        disabled={loadingAction === report._id}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                      >
                        Warn Seller
                      </button>
                      <button
                        onClick={() => handleReportAction(report._id, 'delete-listing')}
                        disabled={loadingAction === report._id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Delete Listing
                      </button>
                      <button
                        onClick={() => handleReportAction(report._id, 'resolve')}
                        disabled={loadingAction === report._id}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No reports found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appeals Tab */}
        {activeTab === 'appeals' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <select
                value={statusFilter}
                onChange={(e) => {
                  const newStatus = e.target.value
                  setStatusFilter(newStatus)
                  fetchAppeals(false, newStatus)
                }}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="pending">Pending</option>
                <option value="all">All Appeals</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Appeals List */}
            <div className="grid gap-4">
              {appeals.map((appeal) => (
                <motion.div
                  key={appeal._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-xl shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{appeal.userId?.name || 'Unknown User'}</h3>
                      <p className="text-sm text-gray-600 mt-1">{appeal.userId?.email || 'Unknown Email'}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted {new Date(appeal.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appeal.status?.charAt(0).toUpperCase() + appeal.status?.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Ban Reason:</p>
                    <p className="text-sm text-gray-600">{appeal.reason}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Appeal Message:</p>
                    <p className="text-sm text-gray-700">{appeal.appealMessage}</p>
                  </div>

                  {appeal.status === 'rejected' && appeal.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-red-700 mb-2">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{appeal.rejectionReason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(`appeal_${appeal._id}`, JSON.stringify(appeal))
                        }
                        router.push(`/appeal-review/${appeal._id}`)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                    >
                      View Details
                    </button>
                    {appeal.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAppealAction(appeal._id, 'approve')}
                          disabled={loadingAction === appeal._id}
                          className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAppealAction(appeal._id, 'reject')}
                          disabled={loadingAction === appeal._id}
                          className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {appeals.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No appeals found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            {/* Sellers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellers.map((seller) => (
                <motion.div
                  key={seller._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Seller Card Header */}
                  <div className="p-6 border-b">
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">{seller.name}</h3>
                      <p className="text-sm text-gray-600">{seller.email}</p>
                      <p className="text-xs text-gray-500 mt-1">ID: {seller._id}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(`seller_${seller._id}`, JSON.stringify(seller))
                          }
                          router.push(`/seller-listings/${seller._id}`)
                        }}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition"
                      >
                        View All
                      </button>
                      <button
                        onClick={() => handleBanUser(seller._id, seller.banned ? 'unban' : 'ban')}
                        disabled={loadingAction === seller._id}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          seller.banned
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } disabled:opacity-50`}
                      >
                        {seller.banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {sellers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No sellers found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
