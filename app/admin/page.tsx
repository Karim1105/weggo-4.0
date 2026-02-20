'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Lock, TrendingUp, Users, Package, Flag, BarChart3, 
  Ban, Check, X, Eye, Star, Zap, AlertTriangle, Search, ChevronDown
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { withCsrfHeader, listingImageUrl } from '@/lib/utils'

type Tab = 'analytics' | 'users' | 'reports' | 'listings'

export default function AdminDashboard() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('analytics')
  
  // Data states
  const [analytics, setAnalytics] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [listings, setListings] = useState<any[]>([])
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'analytics') fetchAnalytics()
      if (activeTab === 'users') fetchUsers()
      if (activeTab === 'reports') fetchReports()
      if (activeTab === 'listings') fetchListings()
    }
    // Intentionally refetch only on auth/tab changes. Search/filter-driven reloads
    // are triggered by explicit UI actions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.user?.role === 'admin') {
        setIsAuthenticated(true)
      }
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (data.success) {
        setIsAuthenticated(true)
        toast.success('Admin access granted')
      } else {
        toast.error(data.error || 'Invalid credentials')
      }
    } catch (error) {
      toast.error('Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      toast.error('Failed to load analytics')
    }
  }

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
      }
    } catch (error) {
      toast.error('Failed to load users')
    }
  }

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      
      const res = await fetch(`/api/admin/reports?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setReports(data.data.reports)
      }
    } catch (error) {
      toast.error('Failed to load reports')
    }
  }

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/listings?limit=100', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setListings(data.data.listings)
      }
    } catch (error) {
      toast.error('Failed to load listings')
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
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
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
        fetchListings()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to update listing')
    } finally {
      setLoadingAction(null)
    }
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 text-center mb-6">Enter your credentials to continue</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter admin username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </motion.div>
      </div>
    )
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
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Site
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 pb-4">
            {([
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'reports', label: 'Reports', icon: Flag },
              { id: 'listings', label: 'Listings', icon: Package },
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
                onClick={fetchUsers}
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
                onClick={fetchReports}
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

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <div key={listing._id} className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {listing.images?.[0] && (
                    <img
                      src={listingImageUrl(listing.images[0])}
                      alt={listing.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {listing.title}
                      {listing.isBoosted && <Zap className="w-4 h-4 text-yellow-500" />}
                    </h3>
                    <p className="text-sm text-gray-600">${listing.price}</p>
                    {listing.averageRating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {listing.averageRating} ({listing.ratingCount} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleBoostListing(listing._id, listing.isBoosted ? 'unboost' : 'boost')}
                  disabled={loadingAction === listing._id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    listing.isBoosted
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  } disabled:opacity-50`}
                >
                  <Zap className="w-4 h-4" />
                  {listing.isBoosted ? 'Unboo' : 'Boost'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
