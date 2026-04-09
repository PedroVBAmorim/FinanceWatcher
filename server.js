// server.js — Express server
// Backend proxy -- The browser can't call Yahoo Finance directly
// because of CORS  browsers block requests to domains that aren't the same as the page origin.
// Frontend calls  server, and  server calls Yahoo Finance.
// This also lets us cache results in SQLite so we don't over-fetch.

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { getCached, upsert } = require("./db");

const app = express();
const PORT = 3001;

// cors() to let our frontend call this server.
// Without this, the browser would block the request.
app.use(cors());
app.use(express.json());
// check the server is running
app.get("/", (req, res) => {
  res.json({ status: "FinanceIQ server is running" });
});

// GET /api/quote/:ticker
// Main endpoint. Frontend calls this like: fetch("http://localhost:3001/api/quote/VOO")
app.get("/api/quote/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  // Step 1: Check the SQLite cache first
  const cached = getCached(ticker);
  if (cached) {
    console.log(`[CACHE HIT] ${ticker}`);
    // Tell the client this came from cache so they can see it working
    return res.json({ ...cached, source: "cache" });
  }

  // Step 2: Cache miss — fetch from Yahoo Finance
  console.log(`[CACHE MISS] ${ticker} — fetching from Yahoo Finance`);

  try {
    // Yahoo Finance v8 quote endpoint — no API key needed
    // This is an unofficial endpoint. It works but could change.
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

    const response = await fetch(url, {
      // Yahoo sometimes blocks requests without a User-Agent header
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();

    // Dig into the Yahoo Finance response structure to get the values we need
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      throw new Error("Unexpected response shape from Yahoo Finance");
    }

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = parseFloat((price - prevClose).toFixed(2));
    const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));

    // Step 3: Save to SQLite cache so the next request within 5 min is instant
    upsert(ticker, price, change, changePercent);

    console.log(`[FETCHED] ${ticker} @ $${price}`);

    return res.json({
      ticker,
      price,
      change,
      changePercent,
      source: "live", // tells the client this is a fresh fetch
    });
  } catch (err) {
    console.error(`[ERROR] ${ticker}:`, err.message);

    // If Yahoo Finance fails, try to return stale cache as a fallback
    // rather than crashing the whole app
    const staleCache = require("better-sqlite3")("cache.db")
      .prepare("SELECT * FROM stock_cache WHERE ticker = ?")
      .get(ticker);

    if (staleCache) {
      console.log(`[STALE CACHE FALLBACK] ${ticker}`);
      return res.json({ ...staleCache, source: "stale-cache" });
    }

    return res.status(500).json({ error: `Could not fetch data for ${ticker}` });
  }
});

app.listen(PORT, () => {
  console.log(`FinanceIQ server running on http://localhost:${PORT}`);
  console.log(`Try it: http://localhost:${PORT}/api/quote/VOO`);
});
