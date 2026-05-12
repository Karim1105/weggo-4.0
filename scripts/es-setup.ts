import { elasticClient } from '../lib/elastic'

async function setupIndices() {
  console.log('Setting up Elasticsearch indices...')

  try {
    // 1. Products (Listings)
    console.log('Setting up "products" index...')
    const productsExists = await elasticClient.indices.exists({ index: 'products' })
    if (!productsExists) {
      await elasticClient.indices.create({
        index: 'products',
        settings: {
          analysis: {
            analyzer: {
              default: {
                type: 'standard'
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text' },
            description: { type: 'text' },
            category: { type: 'keyword' },
            subcategory: { type: 'keyword' },
            condition: { type: 'keyword' },
            price: { type: 'integer' },
            location: { type: 'text' },
            locationKeyword: { type: 'keyword' },
            status: { type: 'keyword' },
            createdAt: { type: 'date' },
            isBoosted: { type: 'boolean' },
            images: { type: 'keyword' },
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
      })
      console.log('Created "products" index.')
    } else {
      console.log('"products" index already exists.')
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
    process.exit(0)
  } catch (error) {
    console.error('Error setting up indices:', error)
    process.exit(1)
  }
}

setupIndices().catch(console.error)
