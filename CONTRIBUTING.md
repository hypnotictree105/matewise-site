# Contributing to MateWise

Thanks for helping. MateWise only works if it's correct. A wrong answer means someone orders a part that doesn't fit and loses weeks of lead time. The rules below exist for that reason. Please read them before opening a pull request.

## Ground rules

1. **No AI or LLM decides connector compatibility.** Mating, contact sizing and BOM assembly are plain lookups and rules in `public/engine.js`. If you use AI to read a datasheet or parse text, its output is a *candidate* for human review, not an input to a compatibility decision.
2. **Every catalog fact carries a `verification` status:** `verified`, `inferred` or `unknown`.
   - `verified` requires a `source`, and a `source_url` where one exists, pointing to a manufacturer or distributor document you actually checked.
   - Never upgrade `inferred` to `verified` without that check. Never remove the field.
3. **Families describe their own behavior in data.** Adding or extending a connector family should be a catalog edit, not an `if (family === 'X')` branch in the engine.
4. **Verified beats convenient.** Ranking puts source-checked parts first. Don't change that to favor fewer spare cavities, lower cost, or anything else.
5. **One manufacturer per connection.** Both halves of a mated pair must come from the same manufacturer (`manufacturer` on the housing, or the family default). Unbranded MIL-spec part numbers only pair with other MIL-spec part numbers.
6. **Stock is not compatibility.** Distributor results never change what the engine considers a valid mate.

## How to contribute

1. Fork the repo and create a branch.
2. Make your change. For data changes, cite the source in the entry itself.
3. Run `npm ci` and `npm test`. Add a test for any engine behavior you change.
4. Open a pull request and fill in the checklist. GitHub runs the tests automatically.

The maintainer reviews and merges. Merging to `main` deploys the live site, so pull requests are never deployed directly.

## Most useful contributions right now

- Individually confirmed D38999 housing part numbers (most are currently `inferred`).
- D38999 sealing plugs and backshells, with sources.
- Exact Deutsch contact plating suffixes (replacing `**` wildcards).
- M12 build-out: coding types, cordset vs. field-wireable, IP ratings.

## Secrets

Never commit API keys, `.env` files or `.wrangler/`. You don't need a Mouser key to develop. Everything except the live stock check works without one.
