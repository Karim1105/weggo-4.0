import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { IMAGE_QUALITY, MAX_IMAGE_DIMENSION } from '../constants'

async function compressAndStripMetadata(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not read selected image'))
      img.src = objectUrl
    })

    const width = image.naturalWidth
    const height = image.naturalHeight
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not process selected image')
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress selected image'))
      }, 'image/jpeg', IMAGE_QUALITY)
    })

    const normalizedName = file.name.replace(/\.[^/.]+$/, '') || 'image'
    return new File([blob], `${normalizedName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

interface UploadedImage {
  file: File
  previewUrl: string
}

export function useImageUpload() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const previewUrlsRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    }
  }, [])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    try {
      const processedFiles = await Promise.all(Array.from(files).map((file) => compressAndStripMetadata(file)))
      const nextImages = processedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))

      previewUrlsRef.current = [...previewUrlsRef.current, ...nextImages.map((image) => image.previewUrl)]
      setImages((prev) => [...prev, ...nextImages])
    } catch {
      toast.error('Failed to process one or more selected images')
    } finally {
      event.target.value = ''
    }
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const target = prev[index]
      if (!target) return prev

      URL.revokeObjectURL(target.previewUrl)
      previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const clearImages = useCallback(() => {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    previewUrlsRef.current = []
    setImages([])
  }, [])

  const imageFiles = useMemo(() => images.map((image) => image.file), [images])
  const imagePreviews = useMemo(() => images.map((image) => image.previewUrl), [images])

  return {
    imageFiles,
    imagePreviews,
    handleImageUpload,
    removeImage,
    clearImages,
  }
}
