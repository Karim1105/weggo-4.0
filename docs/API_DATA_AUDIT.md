# API Data Audit

This file is the current payload-shape audit summary as of 2026-04-15.

It replaces older endpoint-by-endpoint optimization notes that had drifted away from the current code.

## What improved recently

- listings browse and client access are more structured
- message APIs are now layered and paginated
- support tickets have dedicated user/admin APIs
- several admin endpoints now sanitize listing images down to one valid image in list contexts

## Current areas that still deserve attention

### 1. Large detail responses are still normal in some places

This is expected for:

- listing detail
- conversation detail
- ticket detail
- admin review/detail screens

These are not automatically bugs, but they should stay intentional.

### 2. List views should keep trimming images and nested data

Current code generally does this better than before, but new list endpoints should follow the same pattern:

- one image where possible
- selected populated fields only
- pagination by default

### 3. Admin analytics can still become a heavy payload

The admin dashboard has been modularized, but analytics-style endpoints should still be watched carefully because they tend to grow over time.

### 4. Support tickets added a new attachment-bearing surface

Ticket APIs are now part of the payload and storage story:

- attachments are local files
- list screens should avoid sending unnecessary attachment detail
- detail screens can stay richer

## Current guidance

- use the route handlers as the source of truth
- treat this file as a summary, not a schema contract
- if an endpoint changes shape, update this note or the quick-reference docs in the same change
