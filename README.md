# Weggo - AI-Powered Marketplace for Egypt

![Weggo Logo](https://via.placeholder.com/150)

## Overview

Weggo is an innovative second-hand marketplace designed specifically for the Egyptian market. It combines modern web technologies with AI-powered features to create a seamless buying and selling experience.

## Key Features

### AI-Powered Features

1. **Smart Chatbot Assistant**
   - Helps buyers find exactly what they're looking for
   - Provides instant product recommendations
   - Answers questions about pricing, location, and platform usage
   - Supports both English and Arabic

2. **AI Price Suggestion System**
   - Scrapes multiple Egyptian marketplaces (OLX, Dubizzle, Facebook Marketplace)
   - Analyzes market trends and similar listings
   - Provides confident pricing recommendations
   - Shows price ranges for quick sale vs. premium pricing

3. **Personalized Feed**
   - AI-curated product recommendations
   - Based on user preferences and browsing history
   - Location-aware suggestions
   - Trending items in your area

### Innovative Design

- **Modern Glassmorphism UI** - Beautiful, contemporary design with frosted glass effects
- **Smooth Animations** - Framer Motion powered interactions
- **Responsive Design** - Perfect on mobile, tablet, and desktop
- **Dark/Light Mode Ready** - Easy to implement theme switching
- **Arabic Language Support** - RTL layout and Cairo font for Arabic text

### Egyptian Market Focus

- **Local Currency** - All prices in Egyptian Pounds (EGP)
- **Egyptian Cities** - Pre-loaded with major Egyptian cities
- **Bilingual Support** - English and Arabic interface
- **Local Payment Methods** - Integration ready for Fawry, Vodafone Cash, etc.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **State Management**: Zustand
- **Notifications**: React Hot Toast

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/keko1105/weggo.git
cd weggo
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
weggo/
├── app/
│   ├── api/              # API routes
│   │   ├── ai-chat/      # AI chatbot endpoint
│   │   ├── pricing/      # Price suggestion endpoint
│   │   └── listings/     # Listings CRUD
│   ├── sell/             # Sell page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── AIChatbot.tsx
│   ├── AIPricingSuggestion.tsx
│   ├── PersonalizedFeed.tsx
│   ├── ProductCard.tsx
│   ├── Categories.tsx
│   ├── FeaturedListings.tsx
│   ├── HowItWorks.tsx
│   └── Footer.tsx
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Key Components

### AI Chatbot (`AIChatbot.tsx`)
- Floating chat widget
- Intelligent responses
- Quick question suggestions
- Context-aware conversations

### AI Pricing System (`AIPricingSuggestion.tsx`)
- Real-time market analysis
- Multiple platform comparison
- Confidence scoring
- Price range suggestions

### Personalized Feed (`PersonalizedFeed.tsx`)
- AI-curated product listings
- Filter options (For You, Nearby, Trending)
- Infinite scroll ready
- Favorite management

### Product Card (`ProductCard.tsx`)
- Beautiful hover effects
- Quick favorite toggle
- Responsive image handling
- Price formatting

## API Routes

### POST `/api/ai-chat`
Send messages to the AI chatbot
```json
{
  "message": "Show me phones",
  "context": {}
}
```

### POST `/api/pricing`
Get AI price suggestions
```json
{
  "title": "iPhone 13 Pro",
  "description": "Barely used...",
  "category": "electronics",
  "condition": "like-new"
}
```

### GET `/api/listings`
Fetch product listings with filters
```
/api/listings?category=electronics&location=cairo
```

### POST `/api/listings`
Create a new listing
```json
{
  "title": "Product name",
  "price": 1000,
  "category": "electronics",
  ...
}
```

## Customization

### Colors
Edit `tailwind.config.ts` to customize the color scheme:
- Primary: Blue shades
- Secondary: Purple shades
- Accent: Orange shades

### Animations
All animations are defined in `globals.css` and can be customized:
- `float`: Floating effect
- `slide-up/down`: Slide animations
- `fade-in`: Fade effects

### Arabic Support
The app includes full Arabic support:
- Cairo font for Arabic text
- RTL layout switching
- Bilingual content
- note does not completely translate everything correctly, it just inverts the layout for now while implementing helsinki translation model. 

## Security Considerations

- Input validation on all forms
- XSS protection with React
- CSRF tokens for API routes (implement in production)
- Rate limiting for AI endpoints (implement in production)
- Image upload validation (implement in production)
- nothing works yet given the rough state of the front end implemenation status 

## Mobile Optimization

- Responsive grid layouts
- Touch-friendly interactions
- Mobile-optimized navigation
- Swipeable carousels
- mobile layout fully works

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Other Platforms
```bash
npm run build
npm start
```

## Future Enhancements

- [ ] User authentication with NextAuth
- [ ] Real-time chat between buyers and sellers
- [ ] Payment gateway integration (Fawry, PayMob)
- [ ] Image recognition for automatic categorization
- [ ] Advanced search with Elasticsearch
- [ ] Mobile apps (React Native)
- [ ] Push notifications (not sure how to implement given it cannot interact natively with any os cause it is a website)
- [ ] Seller ratings and reviews
- [ ] Delivery tracking
- [ ] Virtual assistant voice interface



## License

no licencing yet but will probalby be under the open source mit licence. 

## Acknowledgments (credits)

- Icons by [Lucide](https://lucide.dev)
- Images from [Unsplash](https://unsplash.com)
- Fonts from [Google Fonts](https://fonts.google.com)




