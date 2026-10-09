# MateWise deployment

Live: https://usematewise.com

The site runs as a Cloudflare Worker named `matewise`. It serves the frontend and the Mouser backend. The route `usematewise.com/*` handles root-domain requests through the existing proxied DNS records. Domain registration stays with Squarespace. `www` is not connected.

## How deploys happen

The source lives on GitHub. The workflow in `.github/workflows/ci-deploy.yml` does two things:

- **Pull requests:** runs `npm test` only. It never has Cloudflare access.
- **Push/merge to `main`:** runs `npm test`, then `npx wrangler deploy` if the tests pass.

It needs two repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template, limited to your account and the `usematewise.com` zone. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Account ID (right-hand side). |

You can also run a deploy by hand from the Actions tab ("Run workflow"), or locally with `npx wrangler login` then `npx wrangler deploy`.

## Mouser API key

`MOUSER_API_KEY` is stored as a Cloudflare Worker secret, not in GitHub. Deploys keep the existing secret. To rotate it, run `npx wrangler secret put MOUSER_API_KEY` locally, or edit it in the Cloudflare dashboard (Worker → Settings → Variables and Secrets). Never put it in Git, `wrangler.jsonc` or a GitHub secret.

A SQLite Durable Object limits this site's Mouser calls to 25 per rolling minute and 900 per rolling 24 hours. Other applications using the same key are outside this counter. Missing or unavailable quota storage fails closed.

## History

- 2026-09-26: first Cloudflare deployment, uploaded through Cloudflare's module-upload API. Verified: homepage 200, API health configured, live DT04-4P lookup returned an exact MPN match with stock and pricing.
- After that: the build was fixed to run from a clean checkout, and `wrangler deploy --dry-run` bundles successfully (about 1.3 MB, 0.87 MB gzipped).

The site remains a connector-selection prototype. Open catalog and engineering-review items stay visible in its BOM. Live stock does not certify compatibility.

References:
- https://developers.cloudflare.com/workers/configuration/routing/routes/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
