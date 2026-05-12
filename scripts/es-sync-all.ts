import connectDB from '../lib/db'
import mongoose from 'mongoose'
import { elasticClient } from '../lib/elastic'
import Product from '../models/Product'
import User from '../models/User'
import Ticket from '../models/Ticket'

async function syncAll() {
  console.log('Starting full Elasticsearch sync...')
  await connectDB()

  try {
    // Sync Users
    console.log('Syncing users...')
    const users = await User.find({}).lean()
    if (users.length > 0) {
      const userOperations = users.flatMap(doc => [
        { index: { _index: 'users', _id: String(doc._id) } },
        {
          name: doc.name,
          email: doc.email,
          role: doc.role,
          isVerified: doc.isVerified,
          createdAt: doc.createdAt
        }
      ])
      await elasticClient.bulk({ refresh: true, operations: userOperations })
      console.log(`Synced ${users.length} users.`)
    }

    // Sync Products (Listings)
    console.log('Syncing products...')
    const products = await Product.find({}).populate('seller', 'name avatar sellerVerified averageRating totalSales').lean()
    if (products.length > 0) {
      const productOperations = products.flatMap((doc: any) => [
        { index: { _index: 'products', _id: String(doc._id) } },
        {
          id: String(doc._id),
          title: doc.title,
          description: doc.description,
          category: doc.category,
          subcategory: doc.subcategory,
          condition: doc.condition,
          price: doc.price,
          location: doc.location,
          locationKeyword: doc.location,
          status: doc.status,
          createdAt: doc.createdAt,
          isBoosted: doc.isBoosted || false,
          images: doc.images,
          seller: doc.seller ? {
            _id: String(doc.seller._id),
            name: doc.seller.name,
            avatar: doc.seller.avatar,
            sellerVerified: doc.seller.sellerVerified,
            averageRating: doc.seller.averageRating,
            totalSales: doc.seller.totalSales
          } : null
        }
      ])
      await elasticClient.bulk({ refresh: true, operations: productOperations })
      console.log(`Synced ${products.length} products.`)
    }

    // Sync Tickets
    console.log('Syncing tickets...')
    const tickets = await Ticket.find({}).lean()
    if (tickets.length > 0) {
      const ticketOperations = tickets.flatMap(doc => [
        { index: { _index: 'tickets', _id: String(doc._id) } },
        {
          userId: String(doc.userId),
          subject: doc.subject,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }
      ])
      await elasticClient.bulk({ refresh: true, operations: ticketOperations })
      console.log(`Synced ${tickets.length} tickets.`)
    }

    console.log('Full Elasticsearch sync completed successfully.')
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error during full sync:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

syncAll().catch(console.error)
