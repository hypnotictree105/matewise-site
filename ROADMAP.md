# MateWise roadmap

Updated 2026-10-09. This document records priorities and acceptance criteria; unchecked items are not implemented.

## Current baseline

- The guided builder and Mouser stock lookup are deployed at https://usematewise.com.
- Han E is a preview in `public/harting-data.js`: 6-, 10-, 16- and 24-position crimp inserts and contacts. Hoods/housings and cable glands remain unresolved BOM lines. Han E is excluded from automatic family comparison.
- Funnel events and the protected /stats dashboard exist. The event list in `server/analytics.js` covers steps, BOMs, CSV, printing and stock checks, but not distributor clicks.

## Priority 1: complete the first HARTING Han connection

Extend the existing Han E preview. Start with one size and arrangement: a 6B cable-to-panel connection with crimp inserts. Add other sizes and cable-to-cable assemblies after the first complete assembly is verified.

- [ ] Source an exact matching hood and panel housing from HARTING documentation. Record size, locking mechanism, gasket/package contents, mounting details, entry direction and thread.
- [ ] Add compatible cable glands using actual cable outside-diameter ranges and entry threads. An unknown diameter or an unsupported combination must remain an open item.
- [ ] Add protective covers for each applicable exposed half; verify the cover's mating interface and locking arrangement. Scale quantities by the selected ends and build quantity.
- [ ] Distinguish insert, enclosure and contact selection in plain-language questions. Explain which parts are included and which must be purchased separately.
- [ ] Model protective earth separately from the insert's signal/contact count; record the PE termination requirements from the manufacturer.
- [ ] Select crimp contacts using the manufacturer's actual conductor ranges. Resolve ambiguous AWG-to-mm2 choices explicitly instead of choosing a contact from nominal AWG alone.
- [ ] Apply the next available contact-count option when the requested count is between supported sizes. Determine unused-position requirements from Han documentation; do not reuse Deutsch sealing-plug rules.
- [ ] Keep compatibility rules deterministic and driven by family data, with manufacturer source links and verification status on each fact.
- [ ] Add exact orderable accessory part numbers to distributor lookup only after compatibility and package contents are verified. A stock result is not compatibility evidence.

Acceptance checks:

- A supported 6B cable-to-panel request produces both inserts, the correct contacts, a matching hood/housing pair, the required gland and selected covers with correct quantities.
- Missing cable diameter, incompatible locking/thread choices and unsupported accessories produce visible unresolved items.
- Tests cover matching and mismatched interfaces, wire/contact boundaries, unused positions, included-part deduplication, both-end quantities and multiple identical builds.
- The existing Deutsch and D38999 selection/BOM tests still pass.

Next Han increments: 10B, 16B and 24B assemblies; cable-to-cable coupler arrangements; additional termination styles. Keep incomplete combinations in preview until their BOM dependencies are covered.

## Priority 2: finish useful usage measurement

Build on the existing analytics rather than adding a second tracker.

- [ ] Track distributor-link activation from both live offers and search-link fallbacks. Distinguish those two destinations in the summary; neither means a purchase occurred.
- [ ] Define the funnel explicitly: build started, steps completed, BOM generated, stock checked, BOM downloaded and distributor clicked. A page view alone is not a build start.
- [ ] Count conversions once per visit/build where appropriate, and define how resetting or starting another build is handled.
- [ ] Distinguish the last observed step from confirmed abandonment; active visits and missing leave events must not be presented as certain drop-offs.
- [ ] Add a development/testing opt-out and document the limits of bot filtering. Random browser-tab IDs measure visits, not distinct people.
- [ ] Review data minimization before expanding collection. The current implementation stores wire counts/sizes and selected housing part numbers for completed BOMs; the original measurement plan only needed event and family counts. Make the collection policy and retention behavior clear.
- [ ] Verify retention cleanup and protected dashboard access, including when traffic is low. Preserve Do Not Track and Global Privacy Control opt-outs.
- [ ] Add meaningful tests for event validation, deduplication, summary totals and unsupported event payloads.

Acceptance checks:

- A test build yields the expected funnel counts, including one distributor-click conversion.
- Opted-out and designated test sessions do not appear in production totals.
- Failed stock lookups and distributor clicks are not reported as purchases or compatibility approvals.
- No API keys, names, emails or free-text requirements are included in event payloads.

## Delivery

Use pull requests with the repository's required tests. Review catalog sources and BOM outputs before merging; changes to main deploy to the live Cloudflare site. This roadmap does not enable features or alter production data collection.
