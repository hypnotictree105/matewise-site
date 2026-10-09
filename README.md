# MateWise

Guided connector selection and BOM builder for sealed electrical connectors (Deutsch DT/DTM/DTP, MIL-DTL-38999, M12). Live at https://usematewise.com.

This is a prototype, not a validated engineering or purchasing system. Every catalog fact carries a verification status (`verified`, `inferred`, `unknown`), and the site shows that status instead of hiding it.

## Run locally

You need Node.js 22 or newer.

    npm ci
    npm test
    npm run dev

Then open http://localhost:8000. `npm test` builds the Worker into `dist/` and runs the test suite. Live Mouser stock lookups only work if you put your own key in a `.env` file (copy `.env.example`). Everything else works without one.

## Project layout

| Path | What it is |
|---|---|
| `public/engine.js` | Matching engine: wire fitting, mating, ranking, BOM. **All compatibility decisions live here.** |
| `public/catalog.js` | Main connector catalog (same content as `legacy/data.json`). |
| `public/reference-data.js`, `public/dust-caps.js` | Source-cited additions: contacts, adapters, boots, dust caps. |
| `public/app.js`, `index.html`, `*.css` | The seven-step guided interface. |
| `server/` | Cloudflare Worker: serves the site and the `/api/offers` Mouser lookup, with a shared rate limit. |
| `tests/` | Node test suite (`npm test`). |
| `legacy/` | The original Python prototype. Kept for reference only. `legacy/CONTEXT.md` explains the design rules. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests are tested automatically. Merges to `main` deploy to usematewise.com.

## License

No license has been chosen yet. You're welcome to read the code and open issues or pull requests. Until a license is added, all rights are reserved and the code and catalog data can't be reused elsewhere.

## Included

- Plain-language entry, structured wire rows, application requirements and mounting questions.
- Complete-pair or existing-part mate workflows against the supplied catalog.
- Candidate selection, user-selected accessories, dependency placeholders, both-end BOM quantities and reusable tools.
- Downloadable draft CSV, printing, catalog evidence and exact-part distributor search links.

## Current limits

- Mouser live lookup requires the server-side MOUSER_API_KEY secret. Search-link fallbacks are not stock confirmations.
- Manufacturer-sourced additions are documented in public/reference-data.js; original labels are retained elsewhere.
- Standard Series III contacts and a narrow size-9 straight adapter/boot reference path now have sources. Other accessory combinations, exact Deutsch plating suffixes and application validation remain incomplete.
- Environmental, electrical, jacket, diameter and adhesive answers are recorded for review; the prototype does not yet validate their full engineering suitability.
- Boot/adapter choices without verified data remain explicit unresolved BOM lines. Included connector package contents need review to avoid duplicate purchases.
- The original Python prototype in `legacy/` is frozen. `public/engine.js` is the only engine in use. A richer validated contact/accessory schema is still needed before any production release.

## Production follow-up

Replace placeholder selections with source-verified, exact part records and constraints. Integrate a server-side distributor adapter with credentials kept out of the browser. Match manufacturer and distributor SKUs exactly, return quantity, currency, minimum/package quantity, timestamp and actual product URLs, and never infer stock from a search link. Keep compatibility approval independent of offer availability.

## Reference path and spare positions

Manufacturer photos explain mounting styles, adapters and boots, with links to source drawings. The example uses size-9 A98 nickel housings without standard contacts, straight adapters and Type 1/W1 boots. The 4–6 mm jacketed cable screen is limited prototype policy, not a manufacturer-approved cable range. Individual SKU stock and application suitability remain unverified.

10 DT conductors select 12 positions, with 10 contacts and 2 sealing plugs per half. D38999 unused positions also need uncrimped contacts. Jam-nut purchase quantities distinguish included, separate and unknown package contents.

Dust caps are selectable for either end or both. Exact housing maps use TE catalog printed p. 50 and Glenair D38999/32-/33 drawing p. C-6. Unmapped housings remain open BOM items. Caps scale per build independently of unused cavity seals. See public/dust-caps.js for source links and scoped coverage.

## Mouser backend

POST /api/offers accepts up to ten catalog part numbers with positive quantities. The browser groups duplicate BOM parts and displays current provider results with timestamps. Exact MPN comparison retains punctuation; manufacturer identity is displayed for review, not inferred. Unknown stock and order quantities stay unknown. Price strings and currencies are preserved. The draft CSV remains an engineering BOM and does not export transient offers.

API reference: https://api.mouser.com/api/docs/v1 (official Swagger, retrieved 2026-09-09). Only /api/v1/search/partnumber is called. No cart or order access.

Set MOUSER_API_KEY in .env for local development and as a Cloudflare secret for production. Never commit it. The worker embeds only public assets. Production uses a shared SQLite Durable Object that limits Mouser requests to 25 per rolling minute and 900 per rolling 24 hours; if that storage is missing or unavailable, lookups fail closed. Requests from other apps sharing the same key are outside this counter. Provider timeouts/errors are sanitized; there is no server-side data cache.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).
