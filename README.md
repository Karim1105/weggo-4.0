# Weggo

## Your Way to Go Second Hand

Weggo is a second-hand marketplace for Egypt that actually tries to solve the fake listing problem. We verify sellers with ID uploads and use AI to help with pricing and recommendations. Think facebook marketplace but without all the scammers.

## What Makes This Different

### Seller Verification
Look, the biggest problem with Egyptian marketplaces is fake listings and scams. So we made seller verification mandatory. You want to sell stuff? Upload your government ID details, get flagged as seller-verified, and then you can post. No verification, no posting.

The verification flow is already built in - there's a seller guidelines page explaining the rules, an ID upload page, and the whole thing integrates with the sell button and featured listings section. Users who are already verified just skip straight to posting their items.

### AI Features That Actually Work (minus the ai pricing system not functional yet)

We built an AI chatbot that helps you find products and answers questions about the platform. It's not perfect but it's pretty helpful.

The AI pricing system is honestly the coolest part in theory it scrapes Dubizzle, and Facebook Marketplace to analyze what similar items are selling for, then suggests a price range. You get a "quick sale" price and a "premium" price depending on how fast you want to sell. the issue we are facing right now is that it is against the TOS of both platforms to scrape their websites you have to have a partner api which we are currently trying to get our hands on

There's also a personalized feed that shows you products based on what you've been looking at. Nothing crazy, just basic recommendations.

### The Design

We went with a modern look - lots of gradients, smooth animations with Framer Motion, and a responsive layout that works great on desktop. The mobile view got a full optimization pass recently so buttons, text sizes, and spacing, doesn't mean it looks or feels good tho it is mid at best. so lower your expectations. 

There's also Arabic language support with RTL layout switching, though the translation isn't fully implemented everywhere yet. It mainly just flips the layout for now.

### Egyptian Market Specific

Everything's in Egyptian Pounds, all the major cities are pre-loaded, and the whole thing is designed around how people actually buy and sell stuff in Egypt. We're not i repeat planning to integrate local payment methods like Fawry and Vodafone Cash EVER. 

## Tech Stack

This is built with Next.js 14 using the App Router and TypeScript. Styling is all Tailwind CSS with Framer Motion for animations. We use Zustand for state management, React Hook Form for forms, and React Hot Toast for notifications. MongoDB Atlas for the database with Mongoose. Icons are from Lucide React.

The backend has proper rate limiting, CSRF protection, input validation, and image upload handling. Security checklist and all that is documented in separate files.

## How to Run This Locally

Clone it down:
```bash
git clone https://github.com/Karim1105/weggo-4.0.git
cd weggo
```

Install everything:
```bash
npm install
```

You'll need a `.env.local` file. The current env surface is documented in `.env.example`.

At minimum for local development:
```bash
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=your_secret_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Optional variables currently used by the codebase:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for password reset email support
- `SEED_ADMIN_SECRET` for the admin seed route
- `SEED_FEATURED_SECRET`, `SEED_SELLER_EMAIL`, `SEED_SELLER_PASSWORD`, `SEED_SELLER_NAME` for featured seed helpers
- `DEBUG_COOKIES_SECRET` and `DEBUG` for non-production debugging

Run the dev server:
```bash
npm run dev
```

Open http://localhost:3000 and you're good to go.

## Project Structure

The main stuff is in:
- `app/` - All the pages and API routes
- `components/` - Reusable React components
- `lib/` - Utility functions, database connection, validation, auth logic
- `models/` - MongoDB/Mongoose models
- `public/` - Static files and uploads

Key pages include the home page, browse page with filters, sell page with AI pricing, profile management, messages, seller guidelines, and the ID verification flow.

## What Works Right Now

The whole front end is functional - you can browse products, filter by category, save favorites, view listings.

Authentication is working with registration, login, and session management. Users can create listings, upload images, edit their profiles, and manage their posts.

Seller verification is set up - the ID upload page exists and the verification flow is integrated into both the Hero section's "Sell Now" button and the Featured Listings "Apply Now" button. It checks if you're logged in and if you're already verified before showing the verification prompt.

The browse page has category filtering, subcategory support, search, location filters, price ranges, and sorting options. Mobile view is partially optimized with responsive text, spacing, and touch-friendly controls, but no where near done. 

Messages, reviews, appeals, wishlist, and admin moderation all have working API routes and UI flows, though some areas are still rough around the edges and are being tightened over time.

**Performance is actually good now** - the wishlist API used to get hammered with 50+ requests per second because of a React useCallback circular dependency that would make any dev want to flip a table. That's fixed. Homepage loads clean, API calls happen once per page load like they should. No more DDoS-ing ourselves.

## What's Not Done Yet

The ID verification backend doesn't actually do manual or third-party verification yet - it stores the submitted ID number and marks the user as seller-verified. You'd need to integrate a real review or verification system to harden that.

Payment integration isn't implemented, because we will not implement it weggo is just a middleman we do not plan on handling this kind of responsibility.

Real-time features like live chat and notifications aren't set up. We'd need WebSockets or something for that.

The "AI" could be way better with more training data and fine-tuning. Right now it's just using basic prompts, i mean go figure we do not have that many recourses.

## Uploads And Deployment

Uploads are currently served from the local filesystem through the `/api/uploads/[...path]` route. This repo does not currently use Cloudinary or another hosted media backend.

## Deployment

This is currently deployed on Vercel connected to the GitHub repo. Every push to main triggers a new deployment. MongoDB Atlas is the production database.

For deployment elsewhere just run:
```bash
npm run build
npm start
```

Make sure your environment variables are set up properly wherever you deploy.

## Future Plans

In no particular order, things we want to add:
- Actually accept government IDs instead of just accepting any image, p.s we will not verify goverment ids with the goverment this is just to link to your profile so if you get banned you get permabanned
- Real-time chat between buyers and sellers
- Better AI with more training and context
- Mobile app with React Native
- Push notifications for new messages and offers
- Delivery tracking integration
- Image recognition for auto-categorization
- More robust admin panel with analytics
- Elasticsearch for better search

## Notes

This is actively being worked on so things change pretty frequently. The codebase has documentation in separate files like FEATURES.md, SECURITY_CHECKLIST.md, and ARCHITECTURE.md if you want more technical details.

No license yet but probably going with MIT open source eventually. i said probably so do not get too excited.

## Credits

Icons from Lucide, placeholder images from Unsplash, fonts from Google Fonts. Built by someone who got tired of dealing with fake listings on Egyptian marketplaces, and screwed over by their teammates



