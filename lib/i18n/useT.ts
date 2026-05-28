'use client'

import { useAppStore } from '@/lib/store'
import { messages, type Locale, type Messages } from '@/lib/i18n/messages'

type Path<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${Path<T[K]>}`
        : `${K}`
    }[keyof T & (string | number)]
  : never

export type TKey = Path<Messages>

function lookup(obj: unknown, dotted: string): string {
  const parts = dotted.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return dotted
    }
  }
  return typeof cur === 'string' ? cur : dotted
}

// Translate one key path into the active locale's string. Supports very
// simple {placeholder} interpolation — pass values as the second argument.
export function useT() {
  const language = useAppStore((state) => state.language) as Locale
  const bundle = messages[language] || messages.en
  const isArabic = language === 'ar'

  function t(key: TKey, vars?: Record<string, string | number>): string {
    let result = lookup(bundle, key)
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(`{${k}}`, String(v))
      }
    }
    return result
  }

  return { t, locale: language, isArabic }
}
