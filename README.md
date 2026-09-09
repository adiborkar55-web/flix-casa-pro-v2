# FlixCasa Pro (CasaStream)

Smart Media Streaming & Downloading app for **Android TV**, **Mobile**, **Laptop**, and **CasaOS**.

## Features

- **Netflix-style UI** — Edge-to-edge poster grid with TMDB/OMDB metadata
- **Multi-source torrent engine** — 1337x, YTS, TorrentGalaxy, LimeTorrents, EZTV, PirateBay with A→B→C automatic fallback
- **Custom video player** — Audio track switcher (Marathi/Hindi/English), quality selector, full transport controls
- **Profile system** — "Who's Watching?" with Kids safe mode, full CRUD
- **My List** — Per-account bookmark library with AES-256 encrypted local storage
- **CasaOS Admin Panel** — Server-only dashboard at `/admin` (localhost/CasaOS only)
- **Compact downloader** — Bound to `/DATA/Downloads/Movies`, <50MB RAM target
- **Multi-account isolation** — Separate watch history, My List, and search per Google account
- **Security** — JWT cookies, CORS, rate limiting, input sanitization, AES-256 encryption

## Quick Start

### Local Development

```bash
cp .env.example .env
# Add your TMDB_API_KEY to .env

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### CasaOS Deployment

```bash
cp .env.example .env
# Configure TMDB_API_KEY, JWT_SECRET, ENCRYPTION_SECRET

docker compose up -d
```

Admin panel: `http://<your-casaos-ip>:3000/admin` (local network only)

### Admin Desktop

Build the Windows installer with `npm run build:exe`. The installer is written to `dist/Flix-Casa-Admin-Setup.exe`. The packaged shell starts the Next standalone server locally; set `FLIXCASA_ADMIN_URL` to target an existing server during development. The assistant panel is preview-only by default and requires an `AI_API_URL` review proxy for provider-backed suggestions.

## Environment Variables

| Variable | Description |
|---|---|
| `TMDB_API_KEY` | The Movie Database API key |
| `JWT_SECRET` | Session token signing secret (32+ chars) |
| `ENCRYPTION_SECRET` | Server-side AES encryption key |
| `ROOT_ADMIN_EMAIL` | Protected admin account email |
| `DOWNLOAD_PATH` | Download directory (default: `/DATA/Downloads/Movies`) |
| `CASAOS_HOST` | CasaOS hostname for admin access |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `NEXT_PUBLIC_APP_VERSION` | Client version checked by the force-update guard |
| `AI_API_URL` | Optional admin coding-assistant preview proxy |
| `FLIXCASA_ADMIN_URL` | Optional URL loaded by the Electron admin shell |

## Architecture

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # UI components (player, grids, profiles, admin)
├── lib/           # Crypto, JWT, TMDB, torrent engine, security
├── stores/        # Zustand state (auth, profiles, library)
└── types/         # TypeScript interfaces
```

## Admin Panel

Accessible **only** from the CasaOS server / localhost:

- Real-time online/offline status for all Google accounts
- Block / Unblock / Revoke Session controls
- Root admin self-protection (cannot block own account)
- Privacy guard — login metadata only, no watch history displayed

## Client Apps

TV, Mobile, and Laptop clients access the standard UI at `/`. The admin panel is hidden and blocked by middleware for remote clients.

## License

Private — for personal CasaOS deployment.
