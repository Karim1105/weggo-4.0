# API Optimization Guide

This guide is the current implementation guidance for adding or refactoring APIs in this repo.

## 1. Default to pagination for collections

Collection endpoints should not silently grow without bounds.

Prefer:

- `page` + `limit` for admin/ticket style endpoints
- cursor-style pagination where message/history flows benefit from it

## 2. Keep list payloads small

For browse/list/table contexts:

- send one image when the UI only shows one image
- select only the populated fields the UI actually renders
- avoid returning full nested objects when a summary object is enough

## 3. Keep detail payloads intentional

Detail endpoints can be richer, but the shape should still match the actual UI needs.

Before adding fields, check:

- is it rendered immediately
- is it sensitive
- does it belong behind another action

## 4. Use shared helpers and mappers where they exist

Current examples:

- listings client/query helpers
- message repository/service/validator/mapper split
- ticket service helpers on the client side

Prefer extending those patterns over inventing one-off response shaping in each route.

## 5. Validate IDs and inputs early

Recent fixes reinforced this pattern:

- reject malformed IDs with `400`
- return `404` for not-found cases
- keep admin-only and auth-only guards consistent

## 6. Trim media safely

When returning image arrays in list contexts:

- filter invalid/data URLs
- keep the first valid image when only one is needed

## 7. Think about cache and mutation together

If a route both mutates state and can be cached, double-check the behavior.

Examples to watch:

- listing detail views/history
- boosted listings ordering
- recently viewed and unread counts

## 8. Update docs with contract changes

If you change:

- endpoint names
- required params
- response shape
- pagination behavior

then update:

- `API_DATA_DOCUMENTATION.md`
- `API_QUICK_REFERENCE.md`
- any feature-specific docs that mention that endpoint
