# Admin User Review APIs - Quick Reference

## API Endpoints Summary

### 1. Get User Chats
```
GET /api/admin/users/[userId]/chats
```
- View all conversations for a user
- See recent messages and other participants
- Check for communication patterns

**Query Params**: `page`, `limit`, `messageLimit`

---

### 2. Get User Listings
```
GET /api/admin/users/[userId]/listings
```
- View all product listings created by user
- Filter by status (active, sold, pending, deleted)
- See seller statistics and recent reviews

**Query Params**: `page`, `limit`, `status`

---

### 3. Get Ban Appeals (existing)
```
GET /api/admin/ban-appeals
```
- View pending ban appeals
- Filter by status (pending, approved, rejected)

---

### 4. Review Ban Appeal (existing)
```
POST /api/admin/ban-appeals/[appealId]
```
- Approve or reject user appeals
- Can override previous decisions

---

### 5. Ban User
```
POST /api/admin/ban-user
```
- Ban user by userId or email
- Requires ban reason

---

### 6. Unban User
```
POST /api/admin/unban-user
```
- Unban a banned user
- Requires userId or email

---

## Admin User Review Page Flow

```
/admin/users/[userId]
│
├─ User Profile Card
│  ├─ Name, Email, Role
│  ├─ Ban Status
│  ├─ Verification Status
│  └─ Statistics
│
├─ Chats Tab (GET /api/admin/users/[userId]/chats)
│  ├─ List of conversations
│  ├─ Other party info
│  ├─ Product involved
│  └─ Recent messages
│
├─ Listings Tab (GET /api/admin/users/[userId]/listings)
│  ├─ Product list
│  ├─ Status breakdown
│  ├─ Statistics
│  └─ Recent reviews
│
├─ Ban Appeals Tab (GET /api/admin/ban-appeals)
│  ├─ Pending appeals
│  ├─ Appeal message
│  └─ Review buttons
│
└─ Actions Panel
   ├─ Ban User Button → POST /api/admin/ban-user
   ├─ Unban User Button → POST /api/admin/unban-user
   └─ Approve/Reject Appeal → POST /api/admin/ban-appeals/[id]
```

---

## Data Flow for User Review Page

### Step 1: Load User Review Page
```bash
# Fetch user chats
GET /api/admin/users/507f.../chats?page=1&limit=20

# Fetch user listings
GET /api/admin/users/507f.../listings?status=all&page=1&limit=20

# Fetch pending appeals for this user
GET /api/admin/ban-appeals?status=pending

# All three can be parallelized for faster loading
```

### Step 2: Review Content
- Admin reviews chats for policy violations
- Admin checks listings for prohibited items
- Admin reviews customer feedback and ratings
- Admin checks ban appeals if any

### Step 3: Take Action
```bash
# Option A: Ban the user
POST /api/admin/ban-user
{
  "userId": "507f...",
  "reason": "Policy violation in listings"
}

# Option B: Review the appeal
POST /api/admin/ban-appeals/507f...
{
  "action": "reject",
  "rejectionReason": "Appeal does not address the policy violations"
}

# Option C: Unban the user
POST /api/admin/unban-user
{
  "userId": "507f..."
}
```

---

## Key Features for UI Implementation

### Chats Tab
- ✅ Pagination for conversations
- ✅ Show conversation count
- ✅ Show unread message count
- ✅ Show product being discussed
- ✅ Show last message time
- ✅ Expand to see message thread

### Listings Tab
- ✅ Pagination for products
- ✅ Filter by status buttons
- ✅ Show statistics (total, active, sold, views)
- ✅ Show product images
- ✅ Show seller ratings
- ✅ Show boosted status

### General
- ✅ User info card at top
- ✅ Ban status indicator
- ✅ Quick action buttons
- ✅ Modal for ban reason input
- ✅ Confirmation dialogs

---

## Response Data Examples

### Chat Response Keys
```
- conversations[].conversationId
- conversations[].otherUser (name, email, avatar, role)
- conversations[].product (title, price, status)
- conversations[].messageCount
- conversations[].unreadCount
- conversations[].recentMessages[]
```

### Listing Response Keys
```
- seller (averageRating, totalSales, sellerVerified)
- listings[] (title, price, status, views, isBoosted)
- statistics (total, active, sold, pending, deleted, totalViews)
- recentReviews[] (rating, comment, buyerId)
```

---

## Security Notes

- ✅ All endpoints require admin authentication
- ✅ Non-admin requests return 404 (hiding endpoint existence)
- ✅ Admin actions are logged for audit trail
- ✅ User data is sanitized in responses
- ✅ Sensitive data (passwords, tokens) never exposed

---

## Performance Considerations

- Use pagination limits to avoid large data transfers
- Recent messages/reviews are pre-limited (10 and 5 respectively)
- Consider caching user stats if reviewing same user multiple times
- Parallelize API calls in frontend for better UX
