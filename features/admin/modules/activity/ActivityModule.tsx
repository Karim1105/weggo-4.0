import { useEffect, useMemo, useState } from 'react'
import { ActivityLog, AdminNotification } from '@/features/admin/types'

interface ActivityModuleProps {
  logs: ActivityLog[]
  notifications: AdminNotification[]
  refreshTick: number
}

export default function ActivityModule({ logs, notifications, refreshTick }: ActivityModuleProps) {
  const [serverLogs, setServerLogs] = useState<ActivityLog[]>([])

  useEffect(() => {
    const loadActivityLogs = async () => {
      try {
        const response = await fetch('/api/admin/activity-logs?limit=100', { cache: 'no-store' })
        const payload = await response.json()

        if (!response.ok || !payload?.success) return

        setServerLogs(payload.data?.logs ?? [])
      } catch {}
    }

    void loadActivityLogs()
  }, [refreshTick])

  const mergedLogs = useMemo(() => {
    const byId = new Map<string, ActivityLog>()

    for (const log of [...logs, ...serverLogs]) {
      byId.set(log.id, log)
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [logs, serverLogs])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        <div className="mt-4 space-y-3">
          {notifications.length === 0 && <p className="text-sm text-gray-500">No notifications yet.</p>}
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
              <p className="text-xs text-gray-500">{notification.message}</p>
              <p className="mt-1 text-[11px] text-gray-400">{new Date(notification.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Activity logs</h2>
        <div className="mt-4 space-y-3">
          {mergedLogs.length === 0 && <p className="text-sm text-gray-500">No activity records yet.</p>}
          {mergedLogs.map((log) => (
            <div key={log.id} className="rounded-lg border p-3">
              <p className="text-sm font-semibold text-gray-900">{log.action}</p>
              <p className="text-xs text-gray-500">{log.details}</p>
              <p className="mt-1 text-[11px] text-gray-400">
                {new Date(log.createdAt).toLocaleString()} • {log.actor}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
