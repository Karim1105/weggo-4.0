# Weggo

## Your Way to Go Second Hand

Weggo is a second-hand marketplace for Egypt that actually tries to solve the fake listing problem. We verify sellers with ID uploads and use AI to help with pricing and recommendations. Think OLX but without all the scammers.

## What Makes This Different

### Seller Verification
Look, the biggest problem with Egyptian marketplaces is fake listings and scams. So we made seller verification mandatory. You want to sell stuff? Upload your government ID. It gets reviewed and boom, you're a verified seller. No verification, no posting. Simple as that.

The verification flow is already built in - there's a seller guidelines page explaining the rules, an ID upload page, and the whole thing integrates with the sell button and featured listings section. Users who are already verified just skip straight to posting their items.

### AI Features That Actually Work

We built an AI chatbot that helps you find products and answers questions about the platform. It's not perfect but it's pretty helpful.

The AI pricing system is honestly the coolest part - it scrapes OLX, Dubizzle, and Facebook Marketplace to analyze what similar items are selling for, then suggests a price range. You get a "quick sale" price and a "premium" price depending on how fast you want to sell.

There's also a personalized feed that shows you products based on what you've been looking at. Nothing crazy, just basic recommendations.

### The Design

We went with a modern look - lots of gradients, smooth animations with Framer Motion, and a responsive layout that works great on mobile and desktop. The mobile view got a full optimization pass recently so buttons, text sizes, and spacing all scale properly across devices.

There's also Arabic language support with RTL layout switching, though the translation isn't fully implemented everywhere yet. It mainly just flips the layout for now.

### Egyptian Market Specific

Everything's in Egyptian Pounds, all the major cities are pre-loaded, and the whole thing is designed around how people actually buy and sell stuff in Egypt. We're planning to integrate local payment methods like Fawry and Vodafone Cash down the line.

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

You'll need a `.env.local` file with your MongoDB connection string and any other API keys. Check the setup files for details.

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

The whole front end is functional - you can browse products, filter by category, save favorites, view listings, use the AI chatbot, and get pricing suggestions. 

Authentication is working with registration, login, password reset, and session management. Users can create listings, upload images, edit their profiles, and manage their posts.

Seller verification is set up - the ID upload page exists, it validates file types and sizes, and the verification flow is integrated into both the Hero section's "Sell Now" button and the Featured Listings "Apply Now" button. It checks if you're logged in and if you're already verified before showing the verification prompt.

The browse page has category filtering, subcategory support, search, location filters, price ranges, and sorting options. Mobile view is fully optimized with responsive text, spacing, and touch-friendly controls.

Messages system exists but the backend implementation is still being worked on. Same with the review system and some of the admin features.

## What's Not Done Yet

The ID verification backend doesn't actually verify IDs - it just accepts the upload and marks you as verified. You'd need to integrate something like Veriff or build your own review system for that.

Payment integration isn't implemented yet. We're planning Fawry and maybe Vodafone Cash but that's future work.

Real-time features like live chat and notifications aren't set up. We'd need WebSockets or something for that.

The AI could be way better with more training data and fine-tuning. Right now it's just using basic prompts.

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
- Actually verify the government IDs instead of just accepting any image
- Payment gateway integration (Fawry, PayMob)
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

No license yet but probably going with MIT open source eventually.

## Credits

Icons from Lucide, placeholder images from Unsplash, fonts from Google Fonts. Built by someone who got tired of dealing with fake listings on Egyptian marketplaces.




