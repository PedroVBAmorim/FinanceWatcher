# FinanceIQ 💰

A personal budget simulator with live VOO/S&P 500 market data, 50/30/20 rule analysis, and compound investment projections.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3) — caches stock prices for 5 minutes
- **Data**: Yahoo Finance (unofficial API, no key required)

## Features

- Monthly income & expense tracker with category tagging (Needs / Wants / Savings)
- Live VOO price fetched from Yahoo Finance via backend proxy
- 50/30/20 rule checker with letter grade
- Compound investment growth projections
- Month-over-month budget comparison chart
- SQLite caching layer — reduces external API calls by ~95%

## Architecture

```
Browser (index.html)
    │
    │  fetch("http://localhost:3001/api/quote/VOO")
    ▼
Express Server (server.js)
    │
    ├── Check SQLite cache (db.js)
    │       └── If fresh (< 5 min) → return cached data
    │
    └── If stale → fetch from Yahoo Finance
                       └── Save to SQLite → return to browser
```

## Running Locally

### 1. Start the backend

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3001`

Test it: `http://localhost:3001/api/quote/VOO`

### 2. Open the frontend

Open `client/index.html` in your browser directly, or serve it with:

```bash
npx serve ../client
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/quote/:ticker` | Get stock quote (cached 5 min) |

## Deployment

1. Deploy the `server/` folder to [Render](https://render.com) or [Railway](https://railway.app) (free tier)
2. Update `API_BASE` in `client/index.html` to your live server URL
3. Deploy `client/index.html` to GitHub Pages

## Notes

- Yahoo Finance endpoint is unofficial and may change without notice
- SQLite cache file (`cache.db`) is auto-created on first run
- For production, swap Yahoo Finance for a proper API (Polygon.io, Alpha Vantage)
