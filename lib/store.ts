import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  location: string
  rating: number
}

interface Product {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  postedAt: string
  isFavorite: boolean
}

interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void
  
  // Favorites
  favorites: string[]
  setFavorites: (ids: string[]) => void
  addFavorite: (id: string) => void
  removeFavorite: (id: string) => void
  toggleFavorite: (id: string) => void
  
  // Language
  language: 'en' | 'ar'
  setLanguage: (lang: 'en' | 'ar') => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Filters
  filters: {
    category?: string
    location?: string
    minPrice?: number
    maxPrice?: number
    condition?: string
  }
  setFilters: (filters: any) => void
  clearFilters: () => void
  
  // UI State
  isChatbotOpen: boolean
  setChatbotOpen: (isOpen: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),
      
      // Favorites
      favorites: [],
      setFavorites: (ids) => set({ favorites: Array.from(new Set(ids)) }),
      addFavorite: (id) => set((state) => ({
        favorites: state.favorites.includes(id) ? state.favorites : [...state.favorites, id]
      })),
      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter(f => f !== id)
      })),
      toggleFavorite: (id) => {
        const { favorites } = get()
        if (favorites.includes(id)) {
          get().removeFavorite(id)
        } else {
          get().addFavorite(id)
        }
      },
      
      // Language
      language: 'en',
      setLanguage: (lang) => {
        set({ language: lang })
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
      },
      
      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // Filters
      filters: {},
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      clearFilters: () => set({ filters: {} }),
      
      // UI State
      isChatbotOpen: false,
      setChatbotOpen: (isOpen) => set({ isChatbotOpen: isOpen })
    }),
    {
      name: 'weggo-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        language: state.language,
        user: state.user
      })
    }
  )
)



