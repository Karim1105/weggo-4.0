## Ban State & Appeal System Implementation

### Files Created:

#### 1. `models/BanAppeal.ts`
New MongoDB model for storing ban appeals/disputes with the following fields:
- `userId`: Reference to the banned user
- `bannedBy`: Reference to the admin who banned the user
- `reason`: Original ban reason
- `appealMessage`: User's dispute message (max 4096 chars)
- `status`: pending | approved | rejected
- `reviewedBy`: Admin who reviewed the appeal
- `reviewedAt`: When the appeal was reviewed
- `rejectionReason`: Reason if appeal was rejected

#### 2. `app/api/auth/ban-appeal/route.ts`
Public API endpoint for banned users to submit appeals:
- **Endpoint**: POST `/api/auth/ban-appeal`
- **Rate Limit**: 5 requests per hour
- **Input**:
  - `email`: User's email
  - `appealMessage`: Dispute message (10-4096 chars)
- **Validations**:
  - User must exist and be banned
  - Appeal message length between 10 and 4096 characters
  - User can only have one pending appeal at a time
- **Response**: Returns appeal ID and status

#### 3. `app/api/admin/ban-appeals/route.ts`
Admin API to view all ban appeals:
- **Endpoint**: GET `/api/admin/ban-appeals`
- **Access**: Admin only (returns 404 for non-admins)
- **Query Parameters**:
  - `page`: Pagination (default: 1)
  - `limit`: Results per page (default: 20)
  - `status`: Filter by status (pending, approved, rejected, or all)
- **Response**: Appeals list with pagination and statistics

#### 4. `app/api/admin/ban-appeals/[id]/route.ts`
Admin API to review and approve/reject appeals:
- **Endpoint**: POST `/api/admin/ban-appeals/[id]`
- **Access**: Admin only (returns 404 for non-admins)
- **Input**:
  - `action`: 'approve' or 'reject'
  - `rejectionReason`: Required if rejecting (max 1024 chars)
- **Actions**:
  - **Approve**: Unbans the user and updates appeal status
  - **Reject**: Sets appeal status to rejected with reason
- **Response**: Confirmation with appeal ID and reviewed timestamp

### Files Modified:

#### `app/api/auth/login/route.ts`
Added ban check after password verification:
- Checks if `user.banned` is true
- If banned, redirects to login page with query params:
  - `error=banned`
  - `reason=<encoded ban reason>`
- User can then submit appeal through `/api/auth/ban-appeal`

### How It Works:

1. **User Login**:
   - User enters credentials
   - Password is verified
   - System checks if user is banned
   - If banned: Redirect to login with ban reason
   - If not banned: Allow login

2. **Submit Appeal**:
   - Banned user navigates to appeal page
   - Fills in dispute message (max 4096 chars)
   - System validates and creates BanAppeal record
   - Rate limit: 5 appeals per hour to prevent spam

3. **Admin Review**:
   - Admin views pending appeals at `/api/admin/ban-appeals`
   - Reviews user's appeal message and ban reason
   - Can approve (unban user) or reject (with reason)
   - Appeal history is maintained for audit trail

### API Usage Examples:

**Submit Ban Appeal:**
```bash
POST /api/auth/ban-appeal
Content-Type: application/json

{
  "email": "user@example.com",
  "appealMessage": "I believe this ban was a mistake. I was just trying to sell my used phone..."
}
```

**Get Ban Appeals (Admin):**
```bash
GET /api/admin/ban-appeals?status=pending&page=1&limit=20
```

**Review Appeal (Admin):**
```bash
POST /api/admin/ban-appeals/[appealId]
Content-Type: application/json

{
  "action": "approve"
}

// OR

{
  "action": "reject",
  "rejectionReason": "Appeal does not address the original violations"
}
```

### Security Features:
- Ban appeals are only accessible via email verification (no auth required for submission)
- Admin endpoints return 404 to non-admins
- Rate limiting prevents appeal spam
- Message length limits prevent abuse
- Audit trail maintained with reviewer info and timestamps
- Original ban reason is preserved with appeal
