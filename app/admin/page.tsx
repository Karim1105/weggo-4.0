'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AdminShell } from '@/components/admin/AdminShell'
import { ADMIN_NAV_ITEMS, TAB_SUBTITLES, TAB_TITLES } from '@/features/admin/config/navigation'
import { ActivityLog, AdminNotification, AdminRole, AdminTabKey } from '@/features/admin/types'

const OverviewModule = dynamic(() => import('@/features/admin/modules/overview/OverviewModule'))
const UsersModule = dynamic(() => import('@/features/admin/modules/users/UsersModule'))
const ReportsModule = dynamic(() => import('@/features/admin/modules/reports/ReportsModule'))
const AppealsModule = dynamic(() => import('@/features/admin/modules/appeals/AppealsModule'))
const TicketsModule = dynamic(() => import('@/features/admin/modules/tickets/TicketsModule'))
const ListingsModule = dynamic(() => import('@/features/admin/modules/listings/ListingsModule'))
const CategoriesModule = dynamic(() => import('@/features/admin/modules/categories/CategoriesModule'))
const ActivityModule = dynamic(() => import('@/features/admin/modules/activity/ActivityModule'))

export default function AdminDashboardPage() {
  const role: AdminRole = 'admin'
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview')
  const [refreshTick, setRefreshTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  const navItems = useMemo(() => ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role)), [role])
  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshTick((prev) => prev + 1)
    setTimeout(() => setRefreshing(false), 450)
  }

  const handleOpenNotifications = () => {
    setActiveTab('activity')
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const onNotify = (entry: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => {
    setNotifications((prev) => [
      { id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false, ...entry },
      ...prev,
    ])
  }

  const onActivity = (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    setActivityLogs((prev) => [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry }, ...prev])
  }

  return (
    <AdminShell
      items={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      title={TAB_TITLES[activeTab]}
      subtitle={TAB_SUBTITLES[activeTab]}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      unreadNotifications={unreadNotifications}
      onOpenNotifications={handleOpenNotifications}
    >
      {activeTab === 'overview' && <OverviewModule refreshTick={refreshTick} />}
      {activeTab === 'users' && <UsersModule refreshTick={refreshTick} onActivity={onActivity} onNotify={onNotify} />}
      {activeTab === 'reports' && <ReportsModule refreshTick={refreshTick} onActivity={onActivity} onNotify={onNotify} />}
      {activeTab === 'appeals' && <AppealsModule refreshTick={refreshTick} onActivity={onActivity} onNotify={onNotify} />}
      {activeTab === 'tickets' && <TicketsModule refreshTick={refreshTick} />}
      {activeTab === 'listings' && <ListingsModule refreshTick={refreshTick} onActivity={onActivity} onNotify={onNotify} />}
      {activeTab === 'categories' && <CategoriesModule />}
      {activeTab === 'activity' && (
        <ActivityModule logs={activityLogs} notifications={notifications} refreshTick={refreshTick} />
      )}
    </AdminShell>
  )
}
