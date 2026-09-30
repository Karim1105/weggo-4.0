export interface PricingInput {
  title: string
  description: string
  category: string
  condition: string
}

function boundedString(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > max ? null : trimmed
}

/** Validate pricing input so only bounded strings reach the database query. */
export function parsePricingInput(body: unknown): PricingInput | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const title = boundedString(raw.title, 200)
  const description = boundedString(raw.description, 5000)
  const category = boundedString(raw.category, 80)
  const condition = boundedString(raw.condition, 40)
  if (title === null || description === null || category === null || condition === null) return null
  return { title, description, category, condition }
}
