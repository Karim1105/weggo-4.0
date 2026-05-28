import mongoose, { Schema, Document } from 'mongoose'

export interface ISystemSetting extends Document {
  key: string
  value: unknown
  updatedAt: Date
  updatedBy?: mongoose.Types.ObjectId
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
)

export const SYSTEM_SETTING_KEYS = {
  aiChatbotEnabled: 'aiChatbotEnabled',
} as const

export default (mongoose.models.SystemSetting as mongoose.Model<ISystemSetting>) ||
  mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema)
