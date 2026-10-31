# DARK ESSENCE — luxury perfume store

## Run locally (no `npm install` needed)
Requires **Node.js 22.5+** (uses the built-in SQLite).
1. Copy `.env.example` to `.env` and set at least `ADMIN_PASSWORD` (and a long random `SESSION_SECRET`).
2. `node server.js`  → store at http://localhost:3000, admin at http://localhost:3000/admin

## What you must provide
- **ADMIN_PASSWORD** – required, otherwise admin stays disabled.
- **Razorpay account** (paid per transaction; needs KYC). Put `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env`. It provides UPI (GPay, PhonePe, Paytm, BHIM, QR/UPI ID), cards and net banking. Until set, online payment shows "not available" and only Cash on Delivery works. Orders become *Paid* only after server-side signature verification.
- **INSTAGRAM_URL** (optional) for the gallery links. **SITE_URL** when you deploy (sitemap, SEO).
- Email confirmations and automatic WhatsApp sending need paid services (SMTP / WhatsApp Business API) and are NOT enabled. The customer gets a WhatsApp *summary link* they send themselves.

## Before launch — edit in /admin
- **Stock is a placeholder (20 each).** Set your real stock.
- Delivery charge is 0 (none configured). PIN code list is empty (any valid PIN accepted).
- Best seller / New arrival / Limited edition flags are unset; those sections appear when you tick them (Best sellers also auto-fills from real sales).
- Coupons: create in Coupons tab. Prices/MRP/availability: Products tab.
- Product text came only from legible text in your ad images. Marj and Brut have no readable size, so none is shown. Song's ad tagline was unreadable, so it is omitted.

## Deploying
Needs a Node host with a persistent disk for `data/` (VPS, Railway, Render with disk). Serve over HTTPS and set `NODE_ENV=production`.
