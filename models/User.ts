import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  phone?: string
  location?: string
  avatar?: string
  isVerified: boolean
  role: 'user' | 'admin'
  sellerVerified: boolean
  idDocumentUrl?: string
  banned: boolean
  bannedAt?: Date
  bannedReason?: string
  bannedBy?: mongoose.Types.ObjectId
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  blockedUsers?: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    sellerVerified: { type: Boolean, default: false },
    idDocumentUrl: { type: String },
    banned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    bannedReason: { type: String },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)


