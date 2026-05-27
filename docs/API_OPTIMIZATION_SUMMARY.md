# API Optimization Summary

This is the current optimization summary for the repo as of 2026-04-15.

## Directionally improved areas

- listings access is more structured than before
- messages now use a layered backend with better pagination
- support tickets have dedicated user/admin endpoints instead of being absent
- several moderation/detail flows now fetch by route id rather than depending on page-local snapshots

## Current optimization priorities

### 1. Keep admin endpoints disciplined

Admin routes naturally collect a lot of related data. Continue reviewing:

- analytics payload size
- list pagination defaults
- populated field selection

### 2. Keep list views minimal

For browse, favorites, recommendations, sellers, reports, tickets:

- trim images
- avoid over-population
- prefer summaries in tables/cards

### 3. Watch local-file-backed features

Uploads and ticket attachments are still local filesystem data, so payload, storage, and cleanup concerns are linked.

### 4. Keep docs and contracts synced

The biggest historical source of confusion in this repo has been documentation drift after refactors. Treat contract/documentation updates as part of the API work.
