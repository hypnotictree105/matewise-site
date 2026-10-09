# MateWise — Project Context

> **Update (2026-09):** The live engine is now `public/engine.js`, and the catalog it uses is `public/catalog.js` plus the source-cited additions in `public/reference-data.js` and `public/dust-caps.js`. Wherever this file says `matewise_engine.py` or `data.json`, read those instead. The architecture rules below still apply unchanged. The site runs on Cloudflare (see `DEPLOYMENT.md`), not `server.py`. The roadmap and data-status sections are from the Python era.

Read this whole file before changing anything. It exists so a new AI session
can pick up this project without re-deriving decisions that were already
made deliberately.

## What this is

A tool that takes an engineer's wiring requirement (e.g. "8 wires of 16 AWG,
4 of 20 AWG") and returns which connector to use plus the complete parts list
— housing, wedgelock, contacts, sealing plugs — sourced from real
manufacturer/distributor catalogs. Currently covers Deutsch DT/DTM/DTP and
MIL-DTL-38999. M12 industrial connectors are stubbed but not built out.

Owner: Adam, an EE (Navy veteran, combat systems background) currently doing
hardware engineering on a naval craft program. This is a nights-and-weekends
side project. He is new to Python and web dev — explain changes in plain
language, give exact commands, don't assume familiarity with tooling.

## Files

| File | Purpose |
|---|---|
| `matewise_engine.py` | Core logic: parses "8x16 4x20" requirements, bin-packs wires into contact sizes, ranks housing options, builds BOMs. **All compatibility decisions live here as deterministic code.** |
| `match.py` | Earlier/simpler single-part-number lookup ("what mates with DT04-4P"). Still used, still correct, but `matewise_engine.py` is the primary flow now (requirements-in, not part-number-in). |
| `data.json` | All connector data: families, housings, contacts, wedgelocks, insert arrangements, accessories. Every fact carries a `verification` status. **This is the asset.** The code is generic; this file is what makes answers correct. |
| `server.py` | Local web UI. Standard library only (`http.server`), zero pip dependencies, so it runs the moment it's downloaded. Renders MateWise brand styling (dark/lime, Space Grotesk + IBM Plex Mono). |
| `ingest.py` | Extracts *candidate* facts (part numbers, wedgelock names, insert arrangements) from raw catalog text via regex. Outputs a `_candidates.json` file for human review — **never writes directly to `data.json`.** |

## Non-negotiable architecture rules

These were arrived at deliberately after earlier mistakes. Do not undo them
without discussing it with Adam first.

1. **No AI/LLM decides connector compatibility, ever.** Mating, contact
   sizing, and BOM assembly are pure lookup + rules in `matewise_engine.py`.
   If a future feature adds an LLM (e.g. parsing a natural-language request,
   or reading a new datasheet), its output must land as *candidate data for
   human review*, never feed directly into a compatibility decision. This
   constraint exists because a wrong answer here means someone orders a
   part that doesn't fit and loses weeks of lead time — it is not a style
   preference.

2. **Every fact in `data.json` carries `"verification"`: one of
   `"verified"`, `"inferred"`, or `"unknown"`.** `verified` means checked
   against an actual manufacturer or distributor source — add a `"source"`
   field naming it. `inferred` means pattern-matched or guessed and MUST be
   treated as probably wrong until checked. Never silently upgrade
   `inferred` → `verified` without an actual source check. Never delete the
   verification field to make output look cleaner.

3. **Families declare their own matching and packing rules; the engine
   never hardcodes a connector family's behavior.** e.g. `match_on` for
   simple families, `cavity_profile` for mixed-size housings (a D38999
   insert arrangement can be 8 size-16 + 4 size-20 in one shell — this is
   why housings use a profile dict, not a flat cavity count). Adding a new
   connector family should be a `data.json` edit, not a `matewise_engine.py`
   edit. If you find yourself writing `if family == "X"` in the engine,
   stop — that logic belongs in the data.

4. **`ingest.py` never writes to `data.json` automatically.** It writes a
   separate `_candidates.json` file. A human (Adam) reviews and moves
   confirmed facts into `data.json` by hand, or explicitly asks an AI to do
   so after reviewing together. This is the whole point of the extraction
   step — the two failure modes (missed a real fact, or promoted a wrong
   one) are both bad, but silently promoting is worse.

## Known gotchas (already hit, don't re-hit them)

- **Do not name a file `select.py`.** It shadows Python's built-in `select`
  module (used for network I/O) and causes a confusing `ImportError` deep
  in unrelated code. The engine is named `matewise_engine.py` specifically
  because of this.
- **Don't use `str.format()` on HTML/CSS templates.** CSS curly braces
  (`{ }`) collide with Python's format-string syntax. `server.py` uses
  `str.replace("__PREFILL__", ...)` instead — keep that pattern for any new
  templated HTML.
- **Contact size `"22D"` is not numeric.** Any code that sorts or casts
  contact sizes as plain integers will crash on it. See `sizes_accepting()`
  in `matewise_engine.py` for the safe pattern (strip digits before
  casting).
- **M39029 contact part numbers are NOT yet in the data.** D38999 BOMs
  currently show `<size 16 socket contact>` placeholders tagged `unknown`.
  This is the single biggest remaining data gap — bigger than adding a new
  connector family.

## Current state of the data (as of last update)

- **Deutsch DT/DTM/DTP:** housings, wedgelocks, and contacts are
  `verified` against a real TE/Dalroad distributor catalog (source cited
  in each entry). Backshells and tools for a few common sizes are also
  verified. This family is in good shape.
- **D38999:** 53 real MIL-STD-1560 insert arrangements and 7 shell types
  are `verified` against d38999.federalconnectors.com. Housing part
  numbers are `inferred` (pattern-generated from shell type + arrangement,
  not individually confirmed to exist). **Contact part numbers (M39029)
  are entirely missing** — this is the top priority gap.
- **M12:** a handful of housings exist as a proof-of-concept
  (A-coded/D-coded/X-coded, 4 and 8 pin) but the family is not built out.
  This is the second priority if D38999 contacts get filled first.

## What's NOT done yet (roadmap, roughly in order)

1. M39029 contact part numbers for D38999 (see gotcha above)
2. D38999 backshells (accessory type `backshell` is declared but has no
   handler/data for this family yet — see `accessories_catalog` in
   `data.json` for the DT pattern to follow)
3. Build out M12 properly (more coding types, cordset vs field-wireable,
   IP ratings)
4. Live stock/lead-time lookup via distributor APIs — flagged everywhere
   in prior planning docs as "the highest-value feature," not started
5. Convert `server.py` from stdlib `http.server` to something deployable
   (FastAPI + a real host) — only do this once there's an actual reason to
   put it online (e.g. a distributor asks for a link). Don't deploy
   preemptively.

## How to run it

```
python3 server.py
```
Then open `http://localhost:8000`. No pip installs required — everything
here is Python standard library on purpose, so it runs immediately on a
freshly downloaded copy.

## Business context (why this matters for prioritization)

The intended model is free-to-engineers, monetized via distributor
placement/referral (not charging engineers directly — that was an explicit
decision). This means: data accuracy and breadth are the actual product
(a distributor won't partner over a tool with wrong part numbers), and
"looks impressive" matters less than "is correct." When in doubt about
what to work on next, bias toward closing `unknown`/`inferred` gaps over
new features.
