import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const

async function findRouteFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return findRouteFiles(fullPath)
      }
      return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : []
    })
  )
  return files.flat()
}

function extractExportedMethods(source: string): string[] {
  const functionExportRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g
  const constExportRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g
  const methods = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = functionExportRegex.exec(source)) !== null) {
    methods.add(match[1])
  }

  while ((match = constExportRegex.exec(source)) !== null) {
    methods.add(match[1])
  }

  return [...methods]
}

describe('API routes', async () => {
  const apiRoot = path.resolve(process.cwd(), 'app', 'api')
  const routeFiles = (await findRouteFiles(apiRoot)).sort()

  it('discovers API route files', () => {
    expect(routeFiles.length).toBeGreaterThan(0)
  })

  it.each(routeFiles)('has at least one HTTP handler export: %s', async (routeFile) => {
    const source = await fs.readFile(routeFile, 'utf8')
    const methods = extractExportedMethods(source)

    expect(methods.length).toBeGreaterThan(0)
    for (const method of methods) {
      expect(HTTP_METHODS).toContain(method as (typeof HTTP_METHODS)[number])
    }
  })
})
