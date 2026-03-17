# Wiki Speedrun

## Architecture
Single `index.html` with inline CSS + JS. No build step. Deployable to GitHub Pages.

## Pattern
Functional factory pattern (matching type-invaders style):
- `createWikiAPI()` — fetch, parse, strip, cache, search, random
- `createGame()` — state machine (menu → playing → victory), path tracking, victory detection
- `createSearch()` — debounced autocomplete with keyboard navigation
- `createHistory()` — localStorage persistence for past runs

## Wikipedia API
All calls use `&origin=*` for CORS. Three endpoints:
- `action=parse` — fetch article HTML
- `action=opensearch` — autocomplete search
- `action=query&list=random` — random articles

## HTML Processing
Articles are parsed with DOMParser and stripped of:
- Edit section links, reference markers `[1][2]`, inline styles
- Navboxes, catlinks, metadata, authority control, TOC
- Sections: See also, References, External links, Further reading, Notes, Bibliography

## Link Interception
Click handler on article container intercepts `<a href="/wiki/...">` links.
Skips: red links (class="new"), self-links, non-article namespaces (File:, Wikipedia:, etc.).

## Key Design Decisions
- Breadcrumb backtracking: truncates path and increments click count
- "Getting warmer" indicator: scans rendered links for target title match
- Victory check uses normalized title comparison (case-insensitive, underscores → spaces)
- Cache keys are normalized titles; cached under both requested and canonical titles
