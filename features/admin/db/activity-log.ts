
import { ActivityLog } from '@/features/admin/types'
import connectDB from '@/lib/db'
import AdminActivityLog from '@/models/AdminActivityLog'

type CreateActivityLogInput = Omit<ActivityLog, 'id' | 'createdAt'>

export async function createAdminActivityLog(entry: CreateActivityLogInput): Promise<void> {
  await connectDB()
  await AdminActivityLog.create(entry)
}

export async function getAdminActivityLogs(limit = 50): Promise<ActivityLog[]> {
  await connectDB()

  const logs = await AdminActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return logs.map((log: any) => ({
    id: log._id.toString(),
    action: log.action,
    details: log.details,
    actor: log.actor,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
  }))
}
