import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { elasticClient } from '@/lib/elastic'

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
  nationalIdNumber?: string
  averageRating: number
  ratingCount: number
  totalSales: number
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
    nationalIdNumber: { type: String, match: /^[23]\d{13}$/ },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
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

UserSchema.pre('save', async function () {
  if (!this.isNew && !this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

async function indexUserInElastic(doc: any) {
  if (!doc) return
  try {
    await elasticClient.index({
      index: 'users',
      id: String(doc._id),
      document: {
        name: doc.name,
        email: doc.email,
        role: doc.role,
        isVerified: doc.isVerified,
        createdAt: doc.createdAt
      }
    })
  } catch (err) {
    console.error('ES User Index Error:', err)
  }
}

UserSchema.post('save', async function(doc) {
  await indexUserInElastic(doc)
})

UserSchema.post('findOneAndUpdate', async function(doc) {
  await indexUserInElastic(doc)
})

UserSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return
  try {
    await elasticClient.delete({
      index: 'users',
      id: String(doc._id)
    }).catch(e => {
      if (e.meta?.statusCode !== 404) console.error('ES User Delete Error:', e)
    })
  } catch (err) {
    console.error('ES User Delete Error:', err)
  }
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)


