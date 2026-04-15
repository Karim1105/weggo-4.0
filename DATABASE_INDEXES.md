# Database Indexes

This file documents the indexes currently declared in the codebase and the ones you should confirm exist in production.

## Important note

The source of truth is the Mongoose model definitions in `models/`.
If auto-indexing is disabled in a production environment, make sure these indexes are created manually in MongoDB.

## Current model-defined indexes

### `Product`

Declared in [models/Product.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/models/Product.ts):

- text index on `title`, `description`
- `{ category: 1, location: 1, price: 1 }`
- `{ seller: 1 }`
- `{ createdAt: -1 }`
- `{ status: 1 }`
- `{ isBoosted: -1 }`
- `{ condition: 1 }`
- `{ subcategory: 1 }`
- `{ status: 1, isBoosted: -1, createdAt: -1 }`
- `{ status: 1, category: 1, isBoosted: -1, createdAt: -1 }`
- `{ status: 1, subcategory: 1, isBoosted: -1, createdAt: -1 }`
- `{ status: 1, condition: 1, isBoosted: -1, createdAt: -1 }`
- `{ status: 1, seller: 1, createdAt: -1 }`
- `{ status: 1, views: -1, createdAt: -1 }`
- `{ status: 1, averageRating: -1, ratingCount: -1, createdAt: -1 }`
- TTL index on `expiresAt`

### `Message`

Declared in [models/Message.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/models/Message.ts):

- `{ conversationId: 1, createdAt: -1 }`
- `{ sender: 1, receiver: 1 }`
- `{ conversationId: 1, receiver: 1, read: 1 }`
- `{ sender: 1, receiver: 1, product: 1, createdAt: -1 }`

### `Ticket`

Declared in [models/Ticket.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/models/Ticket.ts):

- `{ userId: 1, updatedAt: -1 }`
- `{ status: 1, updatedAt: -1 }`
- text index on `subject`

### `TicketMessage`

Declared in [models/TicketMessage.ts](/run/media/crankylama/shared%20drive/weggo%20on%20my%20end/weggo-4.0/models/TicketMessage.ts):

- `{ ticketId: 1, createdAt: 1 }`

### `Wishlist`

Declared in `models/Wishlist.ts`:

- unique `{ user: 1, product: 1 }`
- `{ user: 1, createdAt: -1 }`

### `ViewHistory`

Declared in `models/ViewHistory.ts`:

- `{ user: 1, viewedAt: -1 }`
- `{ product: 1 }`
- unique `{ user: 1, product: 1 }`

### `SavedSearch`

Declared in `models/SavedSearch.ts`:

- `{ user: 1, createdAt: -1 }`

### `Review`

Declared in `models/Review.ts`:

- `{ seller: 1, createdAt: -1 }`
- `{ product: 1 }`

### `Report`

Declared in `models/Report.ts`:

- `{ listing: 1 }`
- `{ reporter: 1 }`

### Persistent rate limit storage

Declared in `lib/api/middleware/persistentRateLimit.ts`:

- TTL index on `expiresAt`

## Operational recommendation

For an existing production database:

1. verify the indexes above exist in MongoDB
2. verify the TTL indexes are active
3. re-check indexes after large schema or query refactors such as browse, messages, or ticketing changes

## Useful shell checks

```javascript
db.products.getIndexes()
db.messages.getIndexes()
db.tickets.getIndexes()
db.ticketmessages.getIndexes()
```

To inspect usage:

```javascript
db.products.aggregate([{ $indexStats: {} }])
```
