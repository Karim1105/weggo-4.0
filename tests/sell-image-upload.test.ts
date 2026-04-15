import { describe, expect, it } from 'vitest'
import { resolveImageOutput } from '@/app/sell/hooks/useImageUpload'

describe('sell image upload helpers', () => {
  it('preserves PNG output so transparency-friendly images are not forced to jpeg', () => {
    const output = resolveImageOutput({ type: 'image/png', name: 'logo.png' } as File)

    expect(output.targetType).toBe('image/png')
    expect(output.extension).toBe('.png')
    expect(output.quality).toBeUndefined()
  })

  it('preserves WEBP output when possible', () => {
    const output = resolveImageOutput({ type: 'image/webp', name: 'graphic.webp' } as File)

    expect(output.targetType).toBe('image/webp')
    expect(output.extension).toBe('.webp')
  })

  it('falls back to jpeg for other image types', () => {
    const output = resolveImageOutput({ type: 'image/jpeg', name: 'photo.jpg' } as File)

    expect(output.targetType).toBe('image/jpeg')
    expect(output.extension).toBe('.jpg')
  })
})
