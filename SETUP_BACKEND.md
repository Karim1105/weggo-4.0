# Backend Setup Guide - Weggo

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- mongoose (MongoDB)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- multer (file uploads)
- node-cache (caching)
- express-rate-limit (rate limiting)

### 2. Install MongoDB

**Windows:**
- Download MongoDB Community Server from https://www.mongodb.com/try/download/community
- Install and start MongoDB service
- Or use MongoDB Atlas (cloud) - update MONGODB_URI in .env

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 3. Create Environment File

Create `.env.local` in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/weggo
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### 4. Create Upload Directory

The app will automatically create `public/uploads` directory, but you can create it manually:

```bash
mkdir -p public/uploads
```

### 5. Start MongoDB (if local)

Make sure MongoDB is running:
```bash
# Check if running
mongosh

# Or start service
# Windows: MongoDB should start automatically as a service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
```

### 6. Run the Application

```bash
npm run dev
```

## 📁 Database Models

- **User**: Authentication and user data
- **Product**: Product listings
- **Message**: User-to-user messaging
- **Review**: Seller ratings and reviews
- **ViewHistory**: Recently viewed items tracking
- **Wishlist**: User favorites/wishlist

## 🔐 Admin Access

**Stealth Login:**
- Username: `not your average admin`
- Password: `not your average admin`
- URL: `/admin`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/listings` - Get all listings (with filters)
- `POST /api/listings` - Create listing
- `GET /api/listings/[id]` - Get single listing
- `DELETE /api/listings/[id]` - Delete listing

### Wishlist
- `GET /api/wishlist` - Get user wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist` - Remove from wishlist

### Messages
- `GET /api/messages` - Get conversations/messages
- `POST /api/messages` - Send message

### Reviews
- `GET /api/reviews?sellerId=xxx` - Get seller reviews
- `POST /api/reviews` - Create review

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations

### Recently Viewed
- `GET /api/recently-viewed` - Get recently viewed items

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/analytics` - Get analytics data

## Features Implemented

- User registration and login
- JWT-based authentication
- Product CRUD operations
- Image upload (local storage)
- Wishlist/Favorites
- Messaging system
- Reviews and ratings
- Recently viewed items
- Recommendations based on viewing history
- Advanced search with filters
- Rate limiting
- Caching layer
- Admin dashboard
- Analytics

## Notes

- Images are stored locally in `public/uploads/`
- MongoDB connection is cached for performance
- Rate limiting: 100 requests per 15 minutes (configurable)
- Cache TTL: 5-10 minutes (configurable)
- All API routes are protected except registration/login

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Make sure MongoDB is running
- Check MONGODB_URI in .env.local
- Try: `mongosh` to test connection

**Image Upload Fails:**
- Check `public/uploads` directory exists
- Ensure write permissions
- Check file size (max 5MB)

**Authentication Issues:**
- Clear cookies and try again
- Check JWT_SECRET in .env.local
- Verify token expiration (7 days)

## Production Checklist

Before deploying:
- [ ] Change JWT_SECRET to a strong random string
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS
- [ ] Set up image CDN (optional)
- [ ] Enable HTTPS
- [ ] Set up monitoring


