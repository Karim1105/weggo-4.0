export interface CategoryOption {
  id: string
  name: string
  nameAr: string
}

export interface SubcategoryOption {
  id: string
  name: string
}

export const categories: CategoryOption[] = [
  { id: 'electronics', name: 'Electronics', nameAr: 'إلكترونيات' },
  { id: 'furniture', name: 'Furniture', nameAr: 'أثاث' },
  { id: 'vehicles', name: 'Vehicles', nameAr: 'مركبات' },
  { id: 'fashion', name: 'Fashion', nameAr: 'أزياء' },
  { id: 'home', name: 'Home & Garden', nameAr: 'منزل وحديقة' },
  { id: 'sports', name: 'Sports & Outdoors', nameAr: 'رياضة' },
  { id: 'books', name: 'Books & Media', nameAr: 'كتب' },
  { id: 'toys', name: 'Toys & Games', nameAr: 'ألعاب' },
  { id: 'music', name: 'Music', nameAr: 'موسيقى' },
  { id: 'gaming', name: 'Gaming', nameAr: 'ألعاب فيديو' },
]

export const subcategoriesByCategory: Record<string, SubcategoryOption[]> = {
  electronics: [
    { id: 'smartphones', name: 'Smartphones' },
    { id: 'laptops', name: 'Laptops' },
    { id: 'cameras', name: 'Cameras' },
    { id: 'tablets', name: 'Tablets' },
    { id: 'audio', name: 'Audio' },
    { id: 'tv-monitors', name: 'TV & Monitors' },
    { id: 'other-electronics', name: 'Other' },
  ],
  furniture: [
    { id: 'sofas', name: 'Sofas' },
    { id: 'tables', name: 'Tables' },
    { id: 'chairs', name: 'Chairs' },
    { id: 'beds', name: 'Beds' },
    { id: 'storage', name: 'Storage' },
    { id: 'other-furniture', name: 'Other' },
  ],
  vehicles: [
    { id: 'cars', name: 'Cars' },
    { id: 'motorcycles', name: 'Motorcycles' },
    { id: 'bicycles', name: 'Bicycles' },
    { id: 'parts', name: 'Parts & Accessories' },
    { id: 'other-vehicles', name: 'Other' },
  ],
  fashion: [
    { id: 'clothing', name: 'Clothing' },
    { id: 'shoes', name: 'Shoes' },
    { id: 'bags', name: 'Bags' },
    { id: 'watches', name: 'Watches' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'other-fashion', name: 'Other' },
  ],
  home: [
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'garden', name: 'Garden' },
    { id: 'decor', name: 'Decor' },
    { id: 'tools', name: 'Tools' },
    { id: 'other-home', name: 'Other' },
  ],
  sports: [
    { id: 'fitness', name: 'Fitness' },
    { id: 'outdoor', name: 'Outdoor' },
    { id: 'cycling', name: 'Cycling' },
    { id: 'other-sports', name: 'Other' },
  ],
  books: [
    { id: 'books', name: 'Books' },
    { id: 'magazines', name: 'Magazines' },
    { id: 'media', name: 'Media' },
    { id: 'other-books', name: 'Other' },
  ],
  gaming: [
    { id: 'consoles', name: 'Consoles' },
    { id: 'games', name: 'Games' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'other-gaming', name: 'Other' },
  ],
  toys: [
    { id: 'toys', name: 'Toys' },
    { id: 'games', name: 'Games' },
    { id: 'other-toys', name: 'Other' },
  ],
  music: [
    { id: 'instruments', name: 'Instruments' },
    { id: 'equipment', name: 'Equipment' },
    { id: 'other-music', name: 'Other' },
  ],
}

export function normalizeCategoryId(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

export function normalizeSubcategoryId(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

export function isValidCategoryId(category: string | null | undefined): boolean {
  const normalized = normalizeCategoryId(category)
  return categories.some((item) => item.id === normalized)
}

export function isValidSubcategory(category: string | null | undefined, subcategory: string | null | undefined): boolean {
  const normalizedCategory = normalizeCategoryId(category)
  const normalizedSubcategory = normalizeSubcategoryId(subcategory)

  if (!normalizedSubcategory) return true

  return (subcategoriesByCategory[normalizedCategory] || []).some((item) => item.id === normalizedSubcategory)
}

export function getSubcategoryOptions(category: string | null | undefined): SubcategoryOption[] {
  return subcategoriesByCategory[normalizeCategoryId(category)] || []
}
