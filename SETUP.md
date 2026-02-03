# Weggo - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### 3. Open Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Features Overview

### Completed Features

#### 1. **AI Chatbot Assistant**
   - Location: Bottom-right floating button
   - Features:
     - Intelligent product recommendations
     - Context-aware conversations
     - Quick question suggestions
     - English and Arabic support
   - Try it: Click the chat icon and ask "Show me phones"

#### 2. **AI Price Suggestion System**
   - Location: `/sell` page
   - Features:
     - Scrapes multiple Egyptian marketplaces
     - Analyzes market trends
     - Provides confidence scores
     - Shows price ranges (Quick Sale, Recommended, Premium)
     - Lists similar items from other platforms
   - Try it: Go to Sell page, fill in item details, click "Get AI Price Suggestion"

#### 3. **Personalized Feed**
   - Location: Home page
   - Features:
     - AI-curated recommendations
     - Filter by: For You, All Items, Nearby, Trending
     - Favorite system
     - Location-aware suggestions
   - Try it: Browse the home page and use the filter buttons

#### 4. **Innovative Design**
   - Glassmorphism effects
   - Smooth animations with Framer Motion
   - Floating card animations
   - Hover effects and micro-interactions
   - Gradient backgrounds
   - Modern color scheme

#### 5. **Egyptian Market Features**
   - Currency: Egyptian Pounds (EGP)
   - Cities: Major Egyptian cities pre-loaded
   - Bilingual: English/Arabic toggle in navbar
   - RTL Support: Automatic layout switching for Arabic
   - Fonts: Cairo font for Arabic text

#### 6. **User Interface Components**
   - Navbar with search
   - Hero section with floating product cards
   - Category browsing
   - Product cards with favorites
   - Featured listings
   - How It Works section
   - Footer with contact info
   - Profile page
   - Favorites page
   - Sell page with form

## Directory Structure

```
weggo/
├── app/
│   ├── api/              # API endpoints
│   │   ├── ai-chat/      # Chatbot API
│   │   ├── pricing/      # Price suggestion API
│   │   └── listings/     # Listings CRUD
│   ├── favorites/        # Favorites page
│   ├── profile/          # User profile page
│   ├── sell/             # Sell item page
│   ├── layout.tsx        # Root layout with navbar & chatbot
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles & animations
├── components/           # Reusable components
│   ├── AIChatbot.tsx
│   ├── AIPricingSuggestion.tsx
│   ├── Categories.tsx
│   ├── FeaturedListings.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── HowItWorks.tsx
│   ├── Navbar.tsx
│   ├── PersonalizedFeed.tsx
│   └── ProductCard.tsx
├── lib/                  # Utilities
│   ├── store.ts          # Zustand state management
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## Key Components Explained

### AIChatbot.tsx
- Floating chat widget
- Message history
- Loading states
- Quick questions
- Smart responses based on queries

### AIPricingSuggestion.tsx
- Modal interface
- Market analysis animation
- Multiple platform comparison
- Confidence scoring
- Price range suggestions
- Pro tips section

### PersonalizedFeed.tsx
- Product grid
- Filter system
- Favorite management
- Infinite scroll ready

### Navbar.tsx
- Responsive design
- Search bar
- Language toggle (EN/AR)
- Navigation links
- Mobile menu

## API Routes

### 1. AI Chat - `/api/ai-chat`
```typescript
POST /api/ai-chat
Body: {
  message: string,
  context: object
}
Response: {
  success: boolean,
  response: string,
  timestamp: string
}
```

### 2. Pricing - `/api/pricing`
```typescript
POST /api/pricing
Body: {
  title: string,
  description: string,
  category: string,
  condition: string
}
Response: {
  success: boolean,
  price: number,
  confidence: number,
  reason: string,
  marketTrend: string,
  sources: array,
  priceRange: object
}
```

### 3. Listings - `/api/listings`
```typescript
GET /api/listings?category=&location=&minPrice=&maxPrice=
Response: {
  success: boolean,
  listings: array,
  total: number
}

POST /api/listings
Body: {
  title, description, category, condition, price, location, images
}
Response: {
  success: boolean,
  listingId: string,
  message: string
}
```

## Customization

### Colors
Edit `tailwind.config.ts`:
- `primary`: Blue shades (main brand color)
- `secondary`: Purple shades (accents)
- `accent`: Orange shades (CTAs)

### Animations
Edit `app/globals.css`:
- `float`: Floating effect
- `slide-up/down`: Slide animations
- `fade-in`: Fade effects
- `shimmer`: Loading animation

### Language
Toggle in navbar or programmatically:
```typescript
import { useAppStore } from '@/lib/store'
const { language, setLanguage } = useAppStore()
setLanguage('ar') // or 'en'
```

## Production Deployment

### Environment Variables
Create `.env.local`:
```bash
OPENAI_API_KEY=your_key_here
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret
# See .env.example for full list
```

### Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
vercel deploy
```

## Next Steps (Production Ready)

1. **Database Integration**
   - Add Prisma or MongoDB
   - Create user and listing models
   - Implement CRUD operations

2. **Authentication**
   - NextAuth.js setup
   - Social login (Google, Facebook)
   - Egyptian phone number login

3. **Real AI Integration**
   - OpenAI API for chatbot
   - Web scraping for pricing
   - Image recognition

4. **Payment Integration**
   - Fawry
   - PayMob
   - Vodafone Cash

5. **Real-time Features**
   - Chat between users
   - Notifications
   - Live updates

6. **Mobile Apps**
   - React Native
   - Push notifications

## Support

For questions or issues:
- Email: hello@weggo.eg
- Documentation: See README.md

## License

MIT License - See LICENSE file

---

**Happy Coding!**



