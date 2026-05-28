'use client'

import { motion } from 'framer-motion'
import { Search, MessageSquare, Sparkles, Star } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'

export default function HowItWorks() {
  const { t } = useT()
  const steps = [
    {
      icon: Search,
      title: t('howItWorks.steps.discover.title'),
      description: t('howItWorks.steps.discover.description'),
      color: 'from-blue-400 to-blue-600',
      bgPattern: 'search',
      features: [t('howItWorks.feature.aiSearch'), t('howItWorks.feature.smartFilters'), t('howItWorks.feature.personalizedFeed')],
      stats: t('howItWorks.stat.items'),
    },
    {
      icon: MessageSquare,
      title: t('howItWorks.steps.connect.title'),
      description: t('howItWorks.steps.connect.description'),
      color: 'from-purple-400 to-purple-600',
      bgPattern: 'chat',
      features: [t('howItWorks.feature.secureMessaging'), t('howItWorks.feature.realtimeChat'), t('howItWorks.feature.fileSharing')],
      stats: t('howItWorks.stat.instantSupport'),
    },
    {
      icon: Sparkles,
      title: t('howItWorks.steps.deal.title'),
      description: t('howItWorks.steps.deal.description'),
      color: 'from-green-400 to-green-600',
      bgPattern: 'handshake',
      features: [t('howItWorks.feature.safeMeetups'), t('howItWorks.feature.securePayment'), t('howItWorks.feature.escrowService')],
      stats: t('howItWorks.stat.secure'),
    },
    {
      icon: Star,
      title: t('howItWorks.steps.review.title'),
      description: t('howItWorks.steps.review.description'),
      color: 'from-amber-400 to-amber-600',
      bgPattern: 'stars',
      features: [t('howItWorks.feature.rateSellers'), t('howItWorks.feature.writeReviews'), t('howItWorks.feature.buildTrust')],
      stats: t('howItWorks.stat.averageStars'),
    },
  ]

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
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{t('howItWorks.badge')}</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            {t('howItWorks.titlePart1')}
            <span className="gradient-primary bg-clip-text text-transparent">
              {t('howItWorks.titlePart2')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              {/* Step Number */}
              <div className="absolute -top-4 -right-4 z-20">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
              </div>

              {/* Card */}
              <div className="card-modern p-8 text-center hover-lift h-full relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className={`w-full h-full bg-${step.bgPattern}-pattern`} />
                </div>

                <div className="relative z-10">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    <step.icon className="w-10 h-10 text-white" />
                  </motion.div>

                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">{step.description}</p>

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {step.features.map((feature, idx) => (
                      <div key={idx} className="text-sm text-gray-500 flex items-center justify-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="text-2xl font-bold text-primary-600">
                    {step.stats}
                  </div>
                </div>
              </div>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-4 border-l-white border-t-2 border-b-2 border-t-transparent border-b-transparent" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('howItWorks.ctaTitle')}</h3>
            <p className="text-gray-600 mb-8">
              {t('howItWorks.ctaBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="gradient-primary text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                {t('howItWorks.ctaBuy')}
              </button>
              <button className="px-8 py-4 border-2 border-primary-500 text-primary-600 rounded-full font-semibold text-lg hover:bg-primary-50 transition-all">
                {t('howItWorks.ctaSell')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

