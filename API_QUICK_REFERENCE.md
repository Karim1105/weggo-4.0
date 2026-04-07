# API Data Quick Reference

Quick reference table showing what data each API currently sends and what could be optimized.

## Legend
- ✅ = Already optimized
- ⚠️ = Needs optimization
- 🔴 = Critical issue (high data waste)
- 🟡 = Medium priority
- 🟢 = Low priority

---

## Authentication & User APIs

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/auth/login` | POST | Minimal user data + cookies | ✅ Optimized | - |
| `/api/auth/register` | POST | Minimal user data + cookies | ✅ Optimized | - |
| `/api/auth/me` | GET | Full user object (id, name, email, phone, location, role, avatar, flags) | ⚠️ Email/phone on every call | 🟢 Low |
| `/api/auth/logout` | POST | Success message | ✅ Optimized | - |
| `/api/blocks` | GET | Blocked users with **name, email, avatar** | ⚠️ Email not needed | 🟢 Low |

---

## Listings APIs (Core)

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/listings` | GET | Array of listings with **first image only ✅**, **truncated description ✅**, seller (name, avatar) | ⚠️ seller.avatar could be lazy-loaded | 🟢 Low |
| `/api/listings/[id]` | GET | **Full listing** with all images, full description, seller details | ⚠️ Seller phone shown before interest | 🟡 Medium |
| `/api/listings/nearby` | GET | **Full listings** with ALL images, over-populated seller (name, avatar, isVerified, rating, totalSales), distance | 🔴 All images, too many seller fields | 🔴 High |
| `/api/listings/trending` | GET | **Full listings** with ALL images, over-populated seller (name, avatar, rating, totalSales) | 🔴 All images, too many seller fields | 🔴 High |
| `/api/listings/[id]/report` | POST | Success message | ✅ Optimized | - |

---

## User Content APIs

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/wishlist` | GET | **Full product objects** with ALL images, full description, populated seller | 🔴 Should use minimal listing format | 🔴 High |
| `/api/wishlist` (idsOnly=true) | GET | Just product IDs | ✅ Optimized | - |
| `/api/recommendations` | GET | **Full products** with ALL images, full description, populated seller | 🔴 Should use minimal listing format | 🔴 High |
| `/api/recently-viewed` | GET | **Full product objects** | 🔴 Should use minimal listing format | 🔴 High |
| `/api/saved-searches` | GET | Saved search queries | ✅ Optimized | - |

---

## Messages & Reviews APIs

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/messages` (conversation) | GET | Messages with sender/receiver (**name, email ⚠️, avatar**), product (title, price, **all images ⚠️**) | ⚠️ Email not needed, all images sent | 🟡 Medium |
| `/api/messages` (list) | GET | Conversations with **full message objects**, populated users (**email ⚠️**), products (**all images ⚠️**) | 🔴 Should send minimal data | 🟡 Medium |
| `/api/reviews` | GET | Reviews with reviewer (name, avatar), product (title, **all images ⚠️**), rating, comment | ⚠️ All product images sent | 🟡 Medium |

---

## Admin APIs

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/admin/analytics` | GET | **MASSIVE payload** (~100KB+): all stats, recent users, recent products (fully populated), trends, aggregations | 🔴 Should be split into multiple endpoints | 🔴 High |
| `/api/admin/users` | GET | Users with id, name, email, role, location, **phone ⚠️**, flags, **bannedBy (populated ⚠️)** | ⚠️ Phone in list view, bannedBy over-populated | 🟡 Medium |
| `/api/admin/sellers` | GET | **ALL sellers** (no pagination) with **all user fields**, listingCount via **N+1 queries ⚠️** | 🔴 No pagination, N+1 queries, all fields | 🔴 High |
| `/api/admin/reports` | GET | Reports with **listing (all images ⚠️, seller populated ⚠️)**, **reporter (email ⚠️)**, **reviewedBy (email ⚠️)** | 🔴 Over-populated, all images | 🟡 Medium |
| `/api/admin/ban-appeals` | GET | Appeals with user details | Needs review | - |

---

## Utility APIs

| Endpoint | Method | Data Sent | Issues | Priority |
|----------|--------|-----------|--------|----------|
| `/api/pricing` | POST | Price suggestion with confidence, trend, sources, range | ✅ Optimized | - |
| `/api/categories/counts` | GET | Category counts map | ✅ Optimized | - |
| `/api/health` | GET | Health check status | ✅ Optimized | - |
| `/api/ai-chat` | POST | AI chat response | ✅ Appropriate | - |

---

## Data Waste Summary by Category

### 🔴 Critical (60-80% waste)
1. `/api/wishlist` - Full products instead of minimal listings
2. `/api/recommendations` - Full products instead of minimal listings  
3. `/api/recently-viewed` - Full products instead of minimal listings
4. `/api/admin/analytics` - Massive single payload, should be split
5. `/api/admin/sellers` - No pagination + N+1 queries + all fields
6. `/api/listings/nearby` - All images + over-populated seller
7. `/api/listings/trending` - All images + over-populated seller

### 🟡 Medium (30-50% waste)
8. `/api/messages` (list) - Full message objects + emails
9. `/api/admin/reports` - Over-populated listing + emails
10. `/api/reviews` - All product images
11. `/api/listings/[id]` - Seller phone shown too early

### 🟢 Low (10-20% waste)
12. `/api/auth/me` - Email/phone on frequent calls
13. `/api/blocks` - Email not needed
14. `/api/admin/users` - Phone in list + over-populated bannedBy

---

## Field-Level Waste Analysis

### Images (Most Common Issue)
| Where | Current | Should Be | Savings |
|-------|---------|-----------|---------|
| List views | Array of 3-5 images | Single image string | ~60-70% |
| Detail views | All images at once | Progressive loading | ~40% (UX) |

### Population Over-fetching
| Where | Current | Should Be | Savings |
|-------|---------|-----------|---------|
| Seller in listings | All fields | Just name | ~50% |
| Messages | sender.email, receiver.email | Just names | ~20% |
| Reports | reporter.email, reviewedBy.email | Just names | ~15% |
| Blocks | user.email | Just name, avatar | ~15% |

### Description Truncation
| Where | Current | Should Be | Savings |
|-------|---------|-----------|---------|
| `/api/listings` | Truncated ✅ | - | - |
| `/api/wishlist` | Full text | 200 chars max | ~60% |
| `/api/recommendations` | Full text | 200 chars max | ~60% |
| `/api/recently-viewed` | Full text | 200 chars max | ~60% |

### Unbounded Lists
| Endpoint | Current | Should Be | Impact |
|----------|---------|-----------|--------|
| `/api/admin/sellers` | All at once | Paginated (20/page) | 80-95% |
| `/api/messages` | All conversations | Should be OK with filters | - |

---

## Implementation Checklist

### Phase 1: Image Optimization (Quick Win)
- [ ] `/api/wishlist` - limit to first image
- [ ] `/api/recommendations` - limit to first image
- [ ] `/api/recently-viewed` - limit to first image
- [ ] `/api/listings/nearby` - limit to first image
- [ ] `/api/listings/trending` - limit to first image
- [ ] `/api/reviews` - limit to first image
- [ ] `/api/admin/reports` - limit to first image
- [ ] `/api/messages` - limit product images to first

**Expected Impact:** 40-50% reduction in image data

### Phase 2: Remove Unnecessary Fields
- [ ] `/api/messages` - remove sender/receiver email
- [ ] `/api/blocks` - remove email
- [ ] `/api/admin/reports` - remove reporter/reviewedBy email
- [ ] `/api/listings/nearby` - reduce seller fields
- [ ] `/api/listings/trending` - reduce seller fields

**Expected Impact:** 15-25% additional reduction

### Phase 3: Fix Full Object Returns
- [ ] `/api/wishlist` - use minimal listing DTO
- [ ] `/api/recommendations` - use minimal listing DTO
- [ ] `/api/recently-viewed` - use minimal listing DTO

**Expected Impact:** 60-70% reduction in these endpoints

### Phase 4: Pagination & Aggregation
- [ ] `/api/admin/sellers` - add pagination
- [ ] `/api/admin/sellers` - use aggregation for listingCount

**Expected Impact:** 80-90% reduction

### Phase 5: Split Large Endpoints
- [ ] `/api/admin/analytics` - split into:
  - `/api/admin/analytics/overview`
  - `/api/admin/analytics/recent-activity`
  - `/api/admin/analytics/trends`
  - `/api/admin/analytics/categories`

**Expected Impact:** 80-90% reduction per individual call

---

## Total Expected Savings

| Category | Endpoints | Current Avg | Optimized | Savings |
|----------|-----------|-------------|-----------|---------|
| **Listing Arrays** | 7 endpoints | 3-5KB/item | 1-2KB/item | **60-70%** |
| **Messages** | 1 endpoint | 2-3KB/item | 1-1.5KB/item | **40-50%** |
| **Reviews** | 1 endpoint | 2KB/item | 1.2KB/item | **40%** |
| **Admin Analytics** | 1 endpoint | 100KB+ | 10-20KB | **80-90%** |
| **Admin Sellers** | 1 endpoint | 50-100KB | 10-20KB | **80-90%** |
| **Admin Reports** | 1 endpoint | 3KB/item | 1.5KB/item | **50%** |

### Overall: **50-60% reduction across all API responses**

---

## Next Steps

1. ✅ Review documentation
2. ⏭️ Create DTO helper functions
3. ⏭️ Start with Phase 1 (images) - highest ROI
4. ⏭️ Measure actual savings with logging
5. ⏭️ Update frontend if needed
6. ⏭️ Deploy and monitor performance improvements
