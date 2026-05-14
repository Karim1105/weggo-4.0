import { Client } from '@elastic/elasticsearch'

const elasticUrl = process.env.ELASTICSEARCH_NODE_URL || 'http://localhost:9200'

const globalForElastic = global as unknown as {
  _elasticClient?: Client
}

export const elasticClient =
  globalForElastic._elasticClient ||
  new Client({
    node: elasticUrl,
    maxRetries: 1,
    requestTimeout: 1500,
    sniffOnStart: false,
    // Add auth if we set it in later environments
    // auth: { username: process.env.ELASTIC_USERNAME, password: process.env.ELASTIC_PASSWORD }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForElastic._elasticClient = elasticClient
}

export function shouldSkipElasticSync(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
}

export function isIgnorableElasticError(error: unknown): boolean {
  const typedError = error as { name?: string; meta?: { statusCode?: number } }

  return (
    typedError?.name === 'ConnectionError' ||
    typedError?.name === 'TimeoutError' ||
    typedError?.name === 'NoLivingConnectionsError' ||
    typedError?.meta?.statusCode === 0
  )
}
