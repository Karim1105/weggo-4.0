import { memo } from 'react'
import { Camera, X } from 'lucide-react'

interface ImageUploadProps {
  imagePreviews: string[]
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onRemove: (index: number) => void
}

function ImageUploadComponent({ imagePreviews, onUpload, onRemove }: ImageUploadProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Photos
      </label>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {imagePreviews.map((image, index) => (
          <div key={`${image}-${index}`} className="relative aspect-square rounded-lg overflow-hidden group">
            <img src={image} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
          <Camera className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-xs text-gray-500">Add Photo</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}

const ImageUpload = memo(ImageUploadComponent)

export default ImageUpload
