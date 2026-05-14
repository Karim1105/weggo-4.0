import { elasticClient } from '../lib/elastic'
import { pathToFileURL } from 'node:url'

const productMappings = {
  properties: {
    id: { type: 'keyword' },
    title: { type: 'text' },
    description: { type: 'text' },
    category: { type: 'keyword' },
    categoryText: { type: 'text' },
    subcategory: { type: 'keyword' },
    subcategoryText: { type: 'text' },
    condition: { type: 'keyword' },
    price: { type: 'integer' },
    location: { type: 'text' },
    locationKeyword: { type: 'keyword' },
    status: { type: 'keyword' },
    createdAt: { type: 'date' },
    isBoosted: { type: 'boolean' },
    images: { type: 'keyword' },
    averageRating: { type: 'float' },
    ratingCount: { type: 'integer' },
    seller: {
      properties: {
        _id: { type: 'keyword' },
        name: { type: 'text' },
        avatar: { type: 'keyword' },
        sellerVerified: { type: 'boolean' },
        averageRating: { type: 'float' },
        totalSales: { type: 'integer' }
      }
    }
  }
}

export async function setupIndices() {
  console.log('Setting up Elasticsearch indices...')

  await elasticClient.ping()

  // 1. Products (Listings)
  console.log('Setting up "products" index...')
  const productsExists = await elasticClient.indices.exists({ index: 'products' })
  if (!productsExists) {
    await elasticClient.indices.create({
      index: 'products',
      mappings: productMappings as any
    })
    console.log('Created "products" index.')
  } else {
    console.log('"products" index already exists.')
    await elasticClient.indices.putMapping({
      index: 'products',
      ...(productMappings as any)
    })
    console.log('Updated "products" mappings.')
  }

  // 2. Users
  console.log('Setting up "users" index...')
  const usersExists = await elasticClient.indices.exists({ index: 'users' })
  if (!usersExists) {
    await elasticClient.indices.create({
      index: 'users',
      mappings: {
        properties: {
          name: { type: 'text' },
          email: { type: 'text' },
          role: { type: 'keyword' },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'date' }
        }
      }
    })
    console.log('Created "users" index.')
  } else {
    console.log('"users" index already exists.')
  }

  // 3. Tickets
  console.log('Setting up "tickets" index...')
  const ticketsExists = await elasticClient.indices.exists({ index: 'tickets' })
  if (!ticketsExists) {
    await elasticClient.indices.create({
      index: 'tickets',
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          subject: { type: 'text' },
          status: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' }
        }
      }
    })
    console.log('Created "tickets" index.')
  } else {
    console.log('"tickets" index already exists.')
  }

  console.log('Elasticsearch index setup complete.')
}

const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isEntrypoint) {
  setupIndices()
    .then(() => process.exit(0))
    .catch((error) => {
      const typedError = error as { name?: string; meta?: { statusCode?: number } }
      const isConnectionError =
        typedError?.name === 'ConnectionError' ||
        typedError?.name === 'TimeoutError' ||
        typedError?.meta?.statusCode === 0

      if (isConnectionError) {
        console.warn('Elasticsearch is not reachable. Skipping index setup and continuing startup.')
        console.warn('Browse search will not work until Elasticsearch is running and the indices are synced.')
        console.warn('Start services with `docker compose up -d`, then run `npm run es:setup` and `npm run es:sync`.')
        process.exit(0)
      }

      console.error('Error setting up indices:', error)
      process.exit(1)
    })
}
