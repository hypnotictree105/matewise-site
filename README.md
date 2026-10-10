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

## Ordering options and face diagrams

Step 6 shows each half's mating face as a schematic SVG drawn from catalog data (contact count and size mix; DEUTSCH cavity rows), and lets people pick options that change the orderable part number:

- D38999: material & finish letter and keying position (N, A–E), from d38999.federalconnectors.com. Hermetic finish codes are only offered on hermetic shells. Glenair ordering codes and the source-checked reference keep their fixed options.
- DEUTSCH DT/DTM 8- and 12-position: key A (gray), B (black), C (green), D (brown), from TE's DT brochure and drawing DT06-12SX. Both halves always get the same key.

Options are declared per family in `public/options-data.js` and applied generically by `orderPart()` in the engine. The diagrams are schematic: they don't show exact contact positions or cavity numbers; the D38999 panel links to the MIL-STD-1560 chart for the exact layout.

## When nothing matches

`explainNoMatch(s)` in `engine.js` says which requirement removed the last candidates: the family has no parts, no insert holds the wires (with the best one found), the spare-position request, the mounting (with the mounts that do exist), or the one-manufacturer rule (naming both halves). It then tries nearby requests (other connection type, any mount, all families, no spares) and offers only those that return matches, with their counts. Both the guided and quick-entry pages use it.

## Amphenol Tri-Start (TV)

MIL-DTL-38999 Series III has no military in-line receptacle, so a D38999 cable-to-cable pair needs a manufacturer's own parts. The catalog builds Amphenol TV01 line receptacles and TV06 straight plugs (service class RW by default, also RF, RK, RS, DN) for each recorded arrangement, from the Amphenol ordering code. They are marked as ordering-code candidates: confirm insert availability with Amphenol.

## D38999 insert faces (MIL-STD-1560)

`public/insert-layouts.js` holds the true-position contact tables from MIL-STD-1560C w/Change 3 for every D38999 arrangement in the catalog: position ID, x/y in inches and contact size. It is generated, not hand-edited:

```
python3 scripts/insert-layouts-1560.py MIL-STD-1560.pdf profiles.json > public/insert-layouts.js
```

`profiles.json` is `{arrangement: {size: count}}` from the catalog; the script stops if any arrangement's table doesn't match its counts. Mixed-size position IDs come from each figure's summary table and are listed in the script. Faces are drawn to scale with the 1560 pin and cavity diameters. The pin insert is drawn as tabulated and the socket insert as its mirror image.

## Backshells

Step 6 also draws the cable end from the side (schematic) and lists every rear accessory recorded for the selected connector, highlighting the one that goes in the BOM. Data lives in `public/backshell-data.js`:

- TE DEUTSCH DT, 2–12 positions: straight and 90° backshells for plugs (DT06) and receptacles (DT04), plus strain-relief versions for 2–6 positions, from TE's DT brochure (rev 08-25). The strain-relief version is chosen when the cable is jacketed.
- D38999 Series III: AS85049 /38 (straight strain relief), /39 (90° strain relief), /88 (straight EMI/RFI), /89 (45° EMI/RFI) and /69 (heat-shrink boot adapter) per shell size. These stay open BOM lines showing the designation (e.g. M85049/38-17) until a finish letter and self-locking/clamp options are modeled.

## HARTING Han E (preview)

`public/harting-data.js` adds the first HARTING family: Han E crimp inserts with 6, 10, 16 and 24 contacts (male 09 33 0xx 2602, female 09 33 0xx 2702; sizes 6B–24B; 16 A / 500 V; 0.14–4 mm²) and the silver-plated Han E crimp contacts by wire size. Each half is a male or female insert plus contacts; the BOM adds a hood or housing line of the matching Han B size (bulkhead/surface housing or coupler on End A, hood on End B) and a cable-gland line, both open until hoods and housings are modeled. Han E is only offered when chosen explicitly (`in_compare: false`) until then.

The engine hooks are generic family flags: `end_a_role`, `in_compare`, `shells`, `unused_cavity_seals`, `layouts`.

## Coax and USB (head start)

`public/highspeed-data.js`:

- Coax in D38999 Series III: wire groups of kind "Coax / RF" pick a cable. RG-316 goes in size 12 cavities with M39029/102-558 (pin) / M39029/103-559 (socket); RG-180 in size 8 cavities with M39029/60-367 / M39029/59-366 (Glenair RF contacts catalog). Size 8 layouts 21-75 (G75, 4 × #8) and 25-8 (J8, 8 × #8) were added as /20, /24 and /26 housings.
- USB: a "USB / high-speed data" group with USB 2.0 or USB 3.x maps to Amphenol Socapex USBFTV / USB3FTV rugged USB-A connectors (38999 Series III style, shell 15, IP68 mated): square-flange (2) or jam-nut (7) receptacle with a plug (6). One USB port per connection. The ordering code (coding, back termination, plating, nut) is left to complete from the Amphenol catalog, so those lines stay open.
- Ethernet, video and other links still say "needs more data": they need twinax/quadrax contacts, not modeled yet.

## Reference sizes

`public/dimension-data.js` holds sourced reference dimensions, shown on step 6 and in the BOM (reference only, not a fit approval):

- DT plug (DT06) and receptacle (DT04) overall length, width and height for 2–12 positions, from TE's DT brochure "DT Series Dimensions". The 8- and 12-position rows are marked inferred: the source text runs those values together, so confirm them on the TE drawing.
- Wire insulation range the rear seal is made for: DT 2.23–3.68 mm (E-seal versions 1.35–3.05 mm); DTP 3.40–4.32 mm.
- The D38999 size-9 reference path's adapter thread, boot and nut sizes (Glenair drawings).

DEUTSCH face drawings use the true width-to-height ratio when TE dimensions exist, with labeled width and height. Panel cutouts, backshell lengths and D38999 shell dimensions are not in the catalog yet.

## Guided and quick entry

The page has two paths over the same state and engine. **Guided** is the seven-step walkthrough. **Quick entry** puts every input on one page (part lookup, connection, wire table, cable-end items, environment) with the candidate table and parts list updating live underneath. Switching paths keeps the inputs. The choice is remembered per browser.

"Mate a part" takes a typed part number, including ordered variants such as `DT04-12PC` or `D38999/26WG16PN`, resolves it to its catalog housing with `resolvePart()` in `engine.js`, and runs the existing-connector match.

Every analytics event carries `path` (`guided` or `quick`). The step funnel on /stats counts guided visits; a separate table compares the two paths.

## Usage analytics

The site records anonymous funnel events so we can see where people stop and which connectors they ask for. Each browser tab gets a random visit ID (kept in sessionStorage, no cookie). We store the furthest step reached, the last step before leaving, whether a BOM was built, downloaded, printed or stock-checked, and for built BOMs the request (family, wire counts and sizes, mounting, build quantity, housing part numbers). No names, emails, IP addresses or free text. Browsers with Do Not Track or Global Privacy Control are not tracked. Visits older than 180 days are deleted.

Code: `public/track.js` (browser), `server/analytics.js` (storage and validation). View it at `/stats` with the `STATS_KEY` secret.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).
