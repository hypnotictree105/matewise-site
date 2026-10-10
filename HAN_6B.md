# Han E 6B reference assembly

This is a bounded draft assembly, not electrical/environmental approval. Catalog sources were checked on 2026-10-09. Nothing here certifies a complete connector IP rating.

## Try the guided flow

1. Choose **A complete connection**, **Cable to a panel**, and **HARTING Han E**.
2. Enter five circuit wires at 16 AWG. Confirm **1.5 mm²** only if supported by your cable specification and the HARTING contact table; otherwise leave the area open. Record PE separately from the circuit count.
3. Select **No cable shield**, **Flange mounting**, and **Straight out**.
4. Select the six-position female insert `09330062702` and male mate `09330062602`.
5. On **Finish the ends**, select the **6B, single lever, M20** enclosure arrangement, **Jacketed cable**, **6–12 mm** seal range, and a measured **10 mm End B diameter**. The gland requires one round outer jacket; it does not seal loose wires.
6. Optionally select protective covers for both ends. Build the draft BOM.

Example per connection: one of each insert, five socket contacts `09330006204`, five pin contacts `09330006104`, one panel housing, one cable hood, one gland and the selected covers. One circuit position remains empty on each insert. No individual cavity plugs or extra PE crimp contact are ordered. Quantities scale with identical builds; tools remain separate.

## Sources and scope

| Part | Purpose | Manufacturer evidence |
|---|---|---|
| 09330062702 / 09330062602 | 6B female/male crimp inserts, six circuit positions plus PE | [Female](https://b2b.harting.com/09330062702), [male](https://b2b.harting.com/09330062602) |
| 09300060301 | Low bulkhead housing, single lever, NBR seal | [HARTING product data](https://b2b.harting.com/09300060301) |
| 19300061440 | Low aluminium hood, two pegs, straight top M20 entry | [HARTING product data](https://b2b.harting.com/ebusiness/es/Han-6-B-Hood-Top-Entry-LC-2-Pegs-M20/19300061440) |
| 19000005081 | M20 × 1.5 brass gland, 5–9 / 6–12 mm seal arrangements | [HARTING product data](https://b2b.harting.com/19000005081), [HARTING drawing hosted by EVG](https://www.evg.de/media/files_public/710405b3c8deaa70e9ef70de6c6009cb/Harting_KABELVERSCHRAUBUNG_M20x15_5-12mm-19_00_000_5081-102.pdf) |
| 09300065405 | Thermoplastic panel-housing cover, uses housing lever | [HARTING catalog page 31.36](https://b2b.harting.com/files/livebooks/en/PRD0200000100037/downloads/36.pdf) |
| 09300065423 | Hood cover, own lever and fixing cord | [HARTING catalog page 31.35](https://b2b.harting.com/files/livebooks/en/PRD0200000100037/downloads/35.pdf), [product data](https://b2b.harting.com/09300065423) |

[HARTING contact table, section 03, page 34](https://www.farnell.com/datasheets/1807068.pdf) lists the silver contact pairs used here, including both 0.75 and 1.0 mm² options and both 3.0 and 4.0 mm² options. The [0.75 mm² contact product page](https://b2b.harting.com/09330006114) also lists AWG 18. Area selections are explicit catalog sizes, not a numerical conversion or an interpolation between supported sizes. Different areas at the same AWG remain separate BOM rows.

The enclosure rules use explicit insert identities, size, lock and entry-thread constraints. Covers belong to the enclosure interfaces. A 6B insert alone does not establish which cover to order. The gland is a required dependency on the cable end, independent of optional protection. Selecting a different exit, jam-nut mount, shielding or boot leaves this enclosure arrangement unresolved.

## Included parts and open installation work

- The insert has a separate PE terminal: M4 screw, 1.2 Nm per the insert data. PE does not consume a circuit position. Confirm conductor termination and protective bonding from the manufacturer installation drawing.
- The bulkhead housing lists an NBR seal and M4 fixing screws at 1 Nm. Confirm the supplied panel gasket, panel cutout, thickness and fastener length. One unresolved panel mounting hardware/seal-set line remains; no separate guessed gasket is added.
- The gland drawing includes the thread O-ring. Do not add a second O-ring. Select the appropriate seal arrangement and follow the gland installation instructions; do not assume the overall 5–12 mm envelope describes either individual seal range.
- Covers and the gland are separate purchases for these specific shell part numbers. Distributor pack sizes and minimum quantities are handled by the existing offers service and must be checked before ordering.
- Electrical load, insulation clearance, conductor construction, cable bend radius, materials, environment, PE termination and tooling remain engineering review items. The catalog remains outside automatic family comparison.

## Validation

`npm ci` and `npm test`: 59 tests pass, including the existing Deutsch/D38999 suite. Added coverage includes required gland/end assignment, range endpoints and out-of-range values, missing answers, unsupported arrangements, lock/thread/size mismatches, conductor-area ambiguity, scaled covers/contacts, unused positions, stock allowlisting and guided UI state transitions and quick-entry controls.

The UI flow test runs the real event handlers/renderers with a minimal document adapter and analytics opted out. It does not validate browser layout. A live local browser visual check could not be completed because the browser could not reach the local server; perform that check before merging. No production stock lookup or deployment was performed.
