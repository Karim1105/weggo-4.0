import Link from 'next/link'
import { CheckCircle, XCircle, AlertTriangle, Award, Shield } from 'lucide-react'

export default function SellerGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Seller Guidelines & Best Practices
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Build trust, create honest listings, and grow your reputation on Weggo
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8 border-l-4 border-primary-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">
            Weggo is committed to creating a safe, transparent marketplace where buyers can trust what they see. 
            We believe in honest listings, fair pricing, and clear communication. As a seller, you play a crucial 
            role in maintaining this trust.
          </p>
        </div>

        {/* Rules - Must Follow */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Prohibited Practices</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Fake Listings</h3>
                <p className="text-red-700 text-sm">
                  Never create listings for items you don't have or items that don't exist. All listings must be genuine and available for sale.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Deceptive Pricing</h3>
                <p className="text-red-700 text-sm">
                  If your item is listed as <strong>free</strong>, it must be free with no hidden charges. 
                  Never list a laptop at 5 EGP when the actual price is 5,000 EGP. Buyers must be able to trust your listed price.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Bait & Switch</h3>
                <p className="text-red-700 text-sm">
                  Do not show one product in photos but deliver a different or inferior item. What you show is what you must sell.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Misleading Descriptions</h3>
                <p className="text-red-700 text-sm">
                  Be honest about item condition, defects, and specifications. Don't exaggerate or hide important details.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-900 text-sm font-medium">
                <strong>Warning:</strong> Violating these rules will result in listing removal, account suspension, 
                or permanent ban depending on severity. Repeated violations or scam attempts will lead to immediate permanent ban.
              </p>
            </div>
          </div>
        </div>

        {/* Best Practices - Incentives */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900">Best Practices for Success</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Clear, Descriptive Titles</h3>
                <p className="text-green-700 text-sm mb-2">
                  Use specific, searchable titles like "iPhone 13 Pro 256GB Blue - Excellent Condition" instead of "Phone for sale"
                </p>
                <p className="text-green-600 text-xs italic">
                  ✨ Benefit: Better search visibility and automatic listing boost
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">High-Quality Photos</h3>
                <p className="text-green-700 text-sm mb-2">
                  Upload clear, well-lit photos from multiple angles. Show any defects or wear honestly.
                </p>
                <p className="text-green-600 text-xs italic">
                  ✨ Benefit: Higher buyer confidence and faster sales
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Detailed Descriptions</h3>
                <p className="text-green-700 text-sm mb-2">
                  Include brand, model, condition, size, color, any flaws, reason for selling, and what's included.
                </p>
                <p className="text-green-600 text-xs italic">
                  ✨ Benefit: Fewer questions, faster decisions, automatic listing promotion
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Accurate Pricing</h3>
                <p className="text-green-700 text-sm mb-2">
                  Research similar items and price competitively. Be honest about condition when setting price.
                </p>
                <p className="text-green-600 text-xs italic">
                  ✨ Benefit: Builds trust and increases your seller rating
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Responsive Communication</h3>
                <p className="text-green-700 text-sm mb-2">
                  Reply to buyer questions quickly and honestly. Be professional and courteous.
                </p>
                <p className="text-green-600 text-xs italic">
                  ✨ Benefit: Better reviews and potential featured seller status
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-4">Rewards for Honest Sellers</h2>
          <ul className="space-y-3">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Automatic listing boosts for high-quality, detailed listings</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Featured seller badge after maintaining good ratings</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Priority placement in search results</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Verified seller status with ID verification</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Access to premium seller analytics and insights</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/sell"
            className="inline-block px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            Start Selling Now
          </Link>
          <p className="mt-4 text-gray-600 text-sm">
            Questions? <Link href="/contact" className="text-primary-600 hover:underline">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
