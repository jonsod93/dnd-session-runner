# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start Vite dev server (includes creature library API middleware)
npm run build    # Production build to /dist
npm run preview  # Preview production build locally
```

No test framework or linter is configured.

## Tech Stack

- **Frontend**: React 18, React Router v6, Tailwind CSS 3.4
- **Build**: Vite 5.1
- **Deployment**: Vercel (serverless functions + static hosting)
- **Storage**: Vercel Blob Storage (creatures, POIs), localStorage (caching, auth session)
- **Music**: Spotify Web API (OAuth2 PKCE) for combat playlists
- **Maps**: Leaflet + react-leaflet
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **External API**: Notion API (via proxy)

## Architecture

### Project Structure

- `src/pages/` - Route-level components: CombatTracker, MapPage, LoginPage
- `src/components/combat/` - Combat UI: CombatantRow, StatblockPanel, StatblockEditor, modals (Ability, Damage, Initiative)
- `src/components/map/` - Map UI: POIMarker, POIEditor
- `src/hooks/` - State management: useAuth, useCombatState, useLibrary, usePOIs, useSpotify
- `src/utils/` - Helpers: combatUtils, diceUtils, notionUtils
- `src/data/` - Bundled creature library JSON and SRD spell names
- `src/pages/SpotifyCallback.jsx` - Spotify OAuth token exchange
- `api/` - Vercel serverless functions (creatures CRUD, POIs CRUD, Notion proxy, health check)

### Key Patterns

**Combat state** uses `useReducer` in `useCombatState.js` for turn order, initiative, HP tracking, status conditions, and ability usage.

**Creature library** has a dual-mode API: in dev, a Vite plugin (`vite-library-api.js`) handles POST/DELETE against the local JSON file. In production, `/api/creatures.js` uses Vercel Blob Storage with lazy migration (first request seeds blob from bundled data). The `useLibrary` hook caches to localStorage and handles legacy migration from old localStorage edits.

**Notion integration** uses a catch-all proxy (`api/notion/[...path].js`) that forwards requests to the Notion API with server-side auth. In dev, Vite proxies `/notion-api` to `api.notion.com` with the API key injected.

**POIs** use the same dual-mode pattern as creatures: Vercel Blob Storage via `/api/pois.js` in production, with localStorage as a cache.

**Spotify integration** triggers a combat playlist when "Roll Initiative" is clicked. Uses OAuth2 PKCE flow (`useSpotify.js`) with token storage in localStorage. Playlist URI configured via `VITE_SPOTIFY_PLAYLIST_URI`. Degrades gracefully if not connected.

**Auth** is a simple hardcoded credential check in `useAuth.jsx` with localStorage session persistence and an AuthGate wrapper in App.jsx.

### Styling

Tailwind with custom config: gold color palette, Cinzel (display), DM Sans (body), IBM Plex Mono (code) fonts. Dark theme (slate-950 background).

## Environment Variables

- `NOTION_API_KEY` - Notion integration token
- `VITE_API_SECRET` / `API_SECRET` - Shared secret for creature library mutation auth
- `VITE_SPOTIFY_CLIENT_ID` - Spotify app client ID
- `VITE_SPOTIFY_PLAYLIST_URI` - Spotify playlist URI for combat music

## Git Workflow

- Main branch: `main`
- Remote: https://github.com/jonsod93/dnd-session-runner.git
- Always pull latest main before starting work in a new conversation
- Branch off main for all changes
- Merge directly to main when done, no PRs
- Push main after merging
