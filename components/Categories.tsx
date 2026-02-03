'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Smartphone, 
  Sofa, 
  Car, 
  Shirt, 
  Home, 
  Dumbbell, 
  BookOpen, 
  Gamepad2,
  Sparkles,
  TrendingUp,
  Star
} from 'lucide-react'

// Slug must match API/listings and lib/utils categories (e.g. home not home-garden)
const categoryList: { name: string; nameAr: string; slug: string; icon: typeof Smartphone; count: number; gradient: string; bgPattern: string; popular: boolean; description: string }[] = [
  { name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics', icon: Smartphone, count: 0, gradient: 'from-blue-400 via-blue-500 to-blue-600', bgPattern: 'circuit', popular: true, description: 'Phones, laptops, cameras & more' },
  { name: 'Furniture', nameAr: 'أثاث', slug: 'furniture', icon: Sofa, count: 0, gradient: 'from-purple-400 via-purple-500 to-purple-600', bgPattern: 'dots', popular: false, description: 'Sofas, tables, chairs & decor' },
  { name: 'Vehicles', nameAr: 'مركبات', slug: 'vehicles', icon: Car, count: 0, gradient: 'from-green-400 via-green-500 to-green-600', bgPattern: 'waves', popular: true, description: 'Cars, motorcycles, bikes' },
  { name: 'Fashion', nameAr: 'أزياء', slug: 'fashion', icon: Shirt, count: 0, gradient: 'from-pink-400 via-pink-500 to-pink-600', bgPattern: 'zigzag', popular: true, description: 'Clothes, shoes, accessories' },
  { name: 'Home & Garden', nameAr: 'منزل وحديقة', slug: 'home', icon: Home, count: 0, gradient: 'from-yellow-400 via-yellow-500 to-yellow-600', bgPattern: 'grid', popular: false, description: 'Kitchen, garden, tools' },
  { name: 'Sports', nameAr: 'رياضة', slug: 'sports', icon: Dumbbell, count: 0, gradient: 'from-red-400 via-red-500 to-red-600', bgPattern: 'lines', popular: false, description: 'Fitness, outdoor, equipment' },
  { name: 'Books', nameAr: 'كتب', slug: 'books', icon: BookOpen, count: 0, gradient: 'from-indigo-400 via-indigo-500 to-indigo-600', bgPattern: 'books', popular: false, description: 'Books, magazines, media' },
  { name: 'Gaming', nameAr: 'ألعاب فيديو', slug: 'gaming', icon: Gamepad2, count: 0, gradient: 'from-cyan-400 via-cyan-500 to-cyan-600', bgPattern: 'pixels', popular: true, description: 'Consoles, games, accessories' },
]

export default function Categories() {
  const [categories, setCategories] = useState(categoryList)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategoryCounts()
  }, [])

  const fetchCategoryCounts = async () => {
    try {
      const res = await fetch('/api/categories/counts')
      const data = await res.json()
      
      if (data.success) {
        const updatedCategories = categoryList.map(cat => ({
          ...cat,
          count: data.data.counts[cat.slug] || 0
        }))
        setCategories(updatedCategories)
      }
    } catch (error) {
      console.error('Failed to fetch category counts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCount = (count: number) => {
    if (count === 0) return '0'
    if (count < 1000) return count.toString()
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-100 via-transparent to-secondary-100" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent-200 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary-500/10 to-accent-500/10 backdrop-blur-sm border border-primary-200/30 text-primary-700 px-8 py-4 rounded-full text-sm font-bold mb-8 shadow-lg"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 bg-primary-500 rounded-full"
            />
            <span>Explore Categories</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 bg-accent-500 rounded-full"
            />
          </motion.div>
          
          <h2 className="text-6xl lg:text-8xl font-black mb-8 leading-tight">
            <span className="text-gray-900">Discover by{' '}</span>
            <motion.span
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="gradient-primary bg-clip-text text-transparent bg-[length:200%_100%]"
            >
              Category
            </motion.span>
          </h2>
          <p className="text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Find exactly what you're looking for with our smart categorization system
          </p>
        </motion.div>

        {/* Popular Categories */}
        <div className="mb-12">
          <div className="flex items-center space-x-2 mb-8">
            <TrendingUp className="w-5 h-5 text-accent-600" />
            <h3 className="text-xl font-semibold text-gray-900">Popular This Week</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.filter(cat => cat.popular).map((category, index) => (
              <Link key={category.name} href={`/browse?category=${category.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative group cursor-pointer"
                >
                <div className="card-modern p-6 h-full hover-lift">
                  {/* Background Pattern */}
                  <div className={`absolute inset-0 opacity-10 bg-${category.bgPattern}-pattern rounded-2xl`} />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                        <category.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-accent-600">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-semibold">Popular</span>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-xl mb-2 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">{formatCount(category.count)}</span>
                      <span className="text-sm text-gray-500">items</span>
                    </div>
                  </div>
                </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* All Categories */}
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-2 h-2 bg-primary-500 rounded-full" />
            <h3 className="text-xl font-semibold text-gray-900">All Categories</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <Link key={category.name} href={`/browse?category=${category.slug}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="group cursor-pointer"
                >
                  <div className="card-modern p-6 hover-lift h-full">
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h4>
                    <p className="text-sm text-gray-500">{formatCount(category.count)} items</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Can't find what you're looking for?</h3>
              <p className="text-gray-600 mb-4">Use our AI-powered search to find anything</p>
              <button className="gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                Try AI Search
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
