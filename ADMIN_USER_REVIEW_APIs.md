# Admin User Review APIs

These APIs are designed for the admin user review page, allowing admins to view user chats and listings for moderation purposes.

---

## Get User Chats API

**Endpoint**: `GET /api/admin/users/[id]/chats`

**Access**: Admin only (returns 404 for non-admins)

**Description**: Retrieve all conversations for a specific user with recent messages and other user details.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Pagination page number |
| limit | number | 20 | Conversations per page (max 100) |
| messageLimit | number | 10 | Number of recent messages per conversation |

### Response (Success - 200)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "banned": false
    },
    "conversations": [
      {
        "conversationId": "conv_123",
        "otherUser": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Jane Smith",
          "email": "jane@example.com",
          "avatar": "https://...",
          "role": "user"
        },
        "product": {
          "_id": "507f1f77bcf86cd799439013",
          "title": "iPhone 13 Pro",
          "price": 15000,
          "images": ["https://..."],
          "status": "active"
        },
        "messageCount": 15,
        "unreadCount": 3,
        "lastMessageTime": "2024-01-15T10:30:00Z",
        "recentMessages": [
          {
            "_id": "msg_1",
            "sender": {
              "_id": "507f1f77bcf86cd799439011",
              "name": "John Doe",
              "email": "john@example.com"
            },
            "receiver": {
              "_id": "507f1f77bcf86cd799439012",
              "name": "Jane Smith",
              "email": "jane@example.com"
            },
            "content": "Is it still available?",
            "read": true,
            "createdAt": "2024-01-15T10:30:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Error Responses

- **404**: User not found
- **500**: Server error

### Example Usage

```bash
# Get user's first 20 conversations
curl -X GET "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/chats" \
  -H "Cookie: token=<admin_token>"

# Get page 2 with 10 recent messages per conversation
curl -X GET "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/chats?page=2&limit=20&messageLimit=10" \
  -H "Cookie: token=<admin_token>"
```

---

## Get User Listings API

**Endpoint**: `GET /api/admin/users/[id]/listings`

**Access**: Admin only (returns 404 for non-admins)

**Description**: Retrieve all product listings created by a specific user with statistics and recent reviews.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Pagination page number |
| limit | number | 20 | Listings per page (max 100) |
| status | string | all | Filter by status: all, active, sold, pending, deleted |

### Response (Success - 200)

```json
{
  "success": true,
  "data": {
    "seller": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "sellerVerified": true,
      "banned": false,
      "averageRating": 4.8,
      "ratingCount": 42,
      "totalSales": 28
    },
    "listings": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "title": "iPhone 13 Pro 256GB",
        "price": 15000,
        "category": "Electronics",
        "condition": "Like New",
        "location": "Cairo",
        "status": "active",
        "views": 245,
        "images": ["https://..."],
        "isBoosted": true,
        "averageRating": 4.9,
        "ratingCount": 8,
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "statistics": {
      "total": 45,
      "active": 12,
      "sold": 28,
      "pending": 3,
      "deleted": 2,
      "totalViews": 8932
    },
    "recentReviews": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "rating": 5,
        "comment": "Excellent seller, very honest!",
        "createdAt": "2024-01-14T15:20:00Z",
        "buyerId": {
          "_id": "507f1f77bcf86cd799439015",
          "name": "Customer Name",
          "email": "customer@example.com",
          "avatar": "https://..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Error Responses

- **404**: User not found
- **500**: Server error

### Example Usage

```bash
# Get user's active listings
curl -X GET "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/listings?status=active" \
  -H "Cookie: token=<admin_token>"

# Get user's sold listings (page 2)
curl -X GET "http://localhost:3000/api/admin/users/507f1f77bcf86cd799439011/listings?status=sold&page=2&limit=20" \
  -H "Cookie: token=<admin_token>"
```

---

## Use Cases for Admin Review Page

### 1. Moderation Review
- View all user chats to check for prohibited content
- Check user's listings for policy violations
- Review user's transaction history through sold listings
- Check seller ratings and customer feedback

### 2. Account Investigation
- Verify user's communication patterns
- Review listing quality and consistency
- Check seller verified status and track record
- Identify suspicious activity across multiple listings

### 3. Ban/Unban Decision
- Review user's historical listings before deciding on bans
- Check recent conversations for context
- Review customer feedback and reviews
- Assess whether appeal should be considered

### 4. User Appeal Review
- When a banned user appeals, admins can:
  - Review their listing history
  - Check communication patterns
  - View customer feedback
  - Make informed decision on appeal

---

## Features

✅ **Pagination**: Handle large numbers of chats and listings  
✅ **Filtering**: Filter listings by status  
✅ **Statistics**: View aggregated data about user activity  
✅ **Recent Context**: See recent messages and reviews  
✅ **User Info**: Comprehensive seller/user profile data  
✅ **Audit Ready**: All data logged for compliance  
✅ **Admin Only**: Secure endpoints with proper access control  

---

## Integration with User Review Page

These endpoints should be used on an admin user review page accessible at `/admin/users/[id]` with tabs for:

1. **User Info** - Basic user details
2. **Chats** - Conversation history (uses `/api/admin/users/[id]/chats`)
3. **Listings** - Product listings (uses `/api/admin/users/[id]/listings`)
4. **Ban Appeals** - Active/pending appeals (uses `/api/admin/ban-appeals`)
5. **Actions** - Ban/Unban/Review buttons

Example flow:
```
/admin/users
  ├── List all users
  └── Click user → /admin/users/[id]
      ├── View user chats
      ├── View user listings
      ├── View ban status
      ├── Review ban appeals
      └── Take action (ban/unban/investigate)
```
