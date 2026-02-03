# Weggo Quick Start Guide

## Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd weggo
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open Browser
Navigate to: **http://localhost:3000**

---

## Try These Features Now!

### 1. AI Chatbot (30 seconds)
1. Look for the **chat icon** in the bottom-right corner
2. Click it to open the chatbot
3. Try these questions:
   - "Show me phones"
   - "Find laptops"
   - "How does pricing work?"
4. See instant AI responses!

### 2. AI Price Suggestion (2 minutes)
1. Click **"Sell"** in the navbar
2. Fill in:
   - Title: "iPhone 13 Pro Max"
   - Category: Electronics
   - Condition: Like New
3. Click **"Get AI Price Suggestion"**
4. Watch the AI analyze market data!
5. See pricing recommendations from multiple platforms

### 3. Personalized Feed (1 minute)
1. Scroll down on the home page
2. Try different filters:
   - **For You** (recommended)
   - **Nearby** (location-based)
   - **Trending** (popular items)
3. Click the **heart icon** to favorite items
4. Hover over cards to see animations

### 4. Language Toggle (10 seconds)
1. Find the **globe icon** in the navbar
2. Click to toggle English ⇄ Arabic
3. Watch the layout flip to RTL for Arabic!

### 5. Browse Categories (1 minute)
1. Scroll to the "Browse by Category" section
2. Click any category card
3. See hover effects and animations

---

## Project Structure (Quick Reference)

```
weggo/
├── app/
│   ├── page.tsx          ← Home page (START HERE)
│   ├── sell/page.tsx     ← Sell page with AI pricing
│   ├── profile/page.tsx  ← User profile
│   └── favorites/page.tsx ← Saved items
│
├── components/
│   ├── AIChatbot.tsx     ← Chatbot widget
│   ├── AIPricingSuggestion.tsx ← Price AI
│   ├── Navbar.tsx        ← Top navigation
│   └── PersonalizedFeed.tsx ← Product feed
│
└── app/api/
    ├── ai-chat/          ← Chatbot API
    ├── pricing/          ← Pricing AI API
    └── listings/         ← Products API
```

---

## Key Design Elements

### Colors
- **Primary Blue**: `#0ea5e9` - Trust, technology
- **Purple**: `#d946ef` - Innovation
- **Orange**: `#f97316` - Action, energy

### Animations
- **Float**: Smooth up/down motion
- **Hover Lift**: Cards lift on hover
- **Fade In**: Smooth page loads
- **Slide Up**: Modals entrance

### Fonts
- **English**: Inter (Google Fonts)
- **Arabic**: Cairo (Google Fonts)

---

## Common Tasks

### Add a New Component
```bash
# Create in components/
touch components/MyComponent.tsx
```

### Add a New Page
```bash
# Create in app/
mkdir app/mypage
touch app/mypage/page.tsx
```

### Modify Colors
Edit `tailwind.config.ts` → `theme.extend.colors`

### Add Animation
Edit `app/globals.css` → `@layer utilities`

---

## Troubleshooting

### Port 3000 Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Styles Not Updating
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Build Errors
```bash
# Check for TypeScript errors
npm run lint
```

---

## Learn More

### Documentation
- **README.md** - Overview and installation
- **FEATURES.md** - Detailed feature documentation
- **SETUP.md** - Complete setup guide

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### Deployment
- [Deploy on Vercel](https://vercel.com)

---

## Next Steps

### For Development
1. ✅ Explore the AI features
2. ✅ Customize colors and animations
3. ✅ Add your own content
4. ⏭️ Integrate real database
5. ⏭️ Add authentication
6. ⏭️ Connect real AI APIs

### For Production
1. Set up environment variables (`.env.local`)
2. Configure database (Prisma/MongoDB)
3. Add authentication (NextAuth)
4. Integrate OpenAI API
5. Set up image storage (Cloudinary)
6. Deploy to Vercel

---

## Pro Tips

1. **Hot Reload**: Changes auto-refresh the browser
2. **Component Library**: All components in `/components`
3. **Tailwind**: Use Tailwind classes for styling
4. **TypeScript**: Full type safety enabled
5. **Mobile First**: Responsive design built-in

---

## 🎉 You're Ready!

Weggo is now running. Explore, customize, and build amazing features!

**Questions?** Check out:
- FEATURES.md for detailed documentation
- README.md for comprehensive guide
- SETUP.md for production deployment

---

**Happy Coding! 🚀**

Made with ❤️ in Egypt



