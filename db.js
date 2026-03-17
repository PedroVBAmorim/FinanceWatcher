// db.js — SQLite cache layer
// This file sets up our database and handles reading/writing cached stock prices.
// Why cache? Yahoo Finance has no rate limit but we still don't want to hammer it
// every time someone loads the page. We cache prices for 5 minutes.

const Database = require("better-sqlite3");

// This creates a file called cache.db in the server folder.
// If it doesn't exist, SQLite creates it automatically.
const db = new Database("cache.db");

// Create the table if it doesn't exist yet.
// ticker      — the stock symbol e.g. "VOO"
// price       — the last fetched price
// change      — dollar change today
// changePercent — percent change today
// fetchedAt   — Unix timestamp (ms) of when we fetched this, used to check if cache is stale
db.exec(`
  CREATE TABLE IF NOT EXISTS stock_cache (
    ticker        TEXT PRIMARY KEY,
    price         REAL,
    change        REAL,
    changePercent REAL,
    fetchedAt     INTEGER
  )
`);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// getCached: returns cached data for a ticker if it's still fresh, otherwise null
function getCached(ticker) {
  const row = db
    .prepare("SELECT * FROM stock_cache WHERE ticker = ?")
    .get(ticker);

  if (!row) return null; // never been fetched before

  const age = Date.now() - row.fetchedAt;
  if (age > CACHE_TTL) return null; // cache is stale

  return row; // cache is fresh, return it
}

// upsert: insert or update a row for this ticker
// "INSERT OR REPLACE" handles both new tickers and updates to existing ones
function upsert(ticker, price, change, changePercent) {
  db.prepare(`
    INSERT OR REPLACE INTO stock_cache (ticker, price, change, changePercent, fetchedAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(ticker, price, change, changePercent, Date.now());
}

module.exports = { getCached, upsert };
