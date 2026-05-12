import { Client } from '@elastic/elasticsearch'

const elasticUrl = process.env.ELASTICSEARCH_NODE_URL || 'http://localhost:9200'

const globalForElastic = global as unknown as {
  _elasticClient?: Client
}

export const elasticClient =
  globalForElastic._elasticClient ||
  new Client({
    node: elasticUrl,
    // Add auth if we set it in later environments
    // auth: { username: process.env.ELASTIC_USERNAME, password: process.env.ELASTIC_PASSWORD }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForElastic._elasticClient = elasticClient
}
