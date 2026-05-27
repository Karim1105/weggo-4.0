import mongoose, { Document, Schema } from 'mongoose'

export interface ITranslationCache extends Document {
  createdAt: Date
  srcLang: 'en' | 'ar'
  srcText: string
  textHash: string
  tgtLang: 'en' | 'ar'
  tgtText: string
  updatedAt: Date
}

const TranslationCacheSchema = new Schema<ITranslationCache>(
  {
    textHash: {
      type: String,
      required: true,
    },
    srcLang: {
      type: String,
      enum: ['en', 'ar'],
      required: true,
    },
    tgtLang: {
      type: String,
      enum: ['en', 'ar'],
      required: true,
    },
    srcText: {
      type: String,
      required: true,
    },
    tgtText: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

TranslationCacheSchema.index({ textHash: 1, tgtLang: 1 }, { unique: true })

export default mongoose.models.TranslationCache || mongoose.model<ITranslationCache>('TranslationCache', TranslationCacheSchema)
