import { memo } from 'react'
import { motion } from 'framer-motion'
import { Tag, Wand2 } from 'lucide-react'
import type { AISuggestion } from '../types'

interface AISuggestionsPanelProps {
  aiSuggestions: AISuggestion
  showAISuggestions: boolean
  onToggleDetails: () => void
  onApply: () => void
}

function AISuggestionsPanelComponent({
  aiSuggestions,
  showAISuggestions,
  onToggleDetails,
  onApply,
}: AISuggestionsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Wand2 className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">AI Suggestions</span>
          <span className="text-sm text-blue-600">
            ({Math.round(aiSuggestions.confidence * 100)}% confidence)
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleDetails}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showAISuggestions ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showAISuggestions && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Suggested Category: <strong>{aiSuggestions.category}</strong>
            </span>
          </div>
          {aiSuggestions.brand && (
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Detected Brand: <strong>{aiSuggestions.brand}</strong>
              </span>
            </div>
          )}
          {aiSuggestions.suggestedTags.length > 0 && (
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Suggested Tags: <strong>{aiSuggestions.suggestedTags.join(', ')}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        Apply AI Suggestions
      </button>
    </motion.div>
  )
}

const AISuggestionsPanel = memo(AISuggestionsPanelComponent)

export default AISuggestionsPanel
