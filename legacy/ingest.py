#!/usr/bin/env python3
"""
Datasheet -> proposed data.json entries.

This is the automation from tonight's conversation, made concrete.

    python3 ingest.py raw_dt_catalog.txt

WHAT THIS DOES AND DOESN'T DO
------------------------------
It does NOT decide what mates with what. It extracts CANDIDATE facts from
raw catalog text - part numbers, wedgelock names, contact PNs - tagged with
exactly which line of source text they came from.

Every candidate is written back as verification: "unverified_extraction",
never "verified". A human (you) promotes it to "verified" after checking
it against the actual table, because OCR and layout-collapse WILL misread
things - see the DTP wedgelock example below for why this matters.

The value isn't "trust what this outputs." The value is turning a 40-page
PDF into a short list of candidates to check, instead of you retyping
every part number by hand.

PIPELINE
--------
1. Get raw text - pdftotext -layout, or web_fetch with pdf_extract_text.
   Layout mode matters: catalogs are tables, and losing column alignment
   turns a table into word soup.
2. This script - regex patterns per fact type, each tagged with source line.
3. You - review candidates, promote real ones to data.json as "verified".
4. Cross-check - if you later pull the same part from a second source
   (TE's own site vs a distributor catalog) and they agree, confidence
   goes up. If they disagree, that disagreement IS the useful signal -
   it's telling you to call and ask, not guess.
"""

import json
import re
import sys


def find_deutsch_part_numbers(text):
    """
    DT/DTM/DTP housing part numbers.
    Pattern: DT(M|P)?0(4|6)-(digits)(letter?)(S|P)(-suffix)?
    """
    pattern = re.compile(
        r'\b(DT[MP]?0[46]-\d{1,2}[A-D]?[SP](?:-[A-Z0-9]{3,4})?)\b'
    )
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in pattern.finditer(line):
            hits.append({
                "pn": m.group(1),
                "source_line": lineno,
                "context": line.strip()[:80],
            })
    return hits


def find_d38999_shell_types(text):
    """
    'D38999/24 D38999/44 Receptacle, Jam Nut Mount' -> two shell type
    codes mapped to one description (Series III / Series IV pair).
    """
    pattern = re.compile(
        r'D38999/(\d{2})(?:\s+D38999/(\d{2}))?\s+([A-Za-z][A-Za-z ,]+)'
    )
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        m = pattern.search(line)
        if m:
            hits.append({
                "series_iii_type": m.group(1),
                "series_iv_type": m.group(2),
                "description": m.group(3).strip(),
                "source_line": lineno,
                "context": line.strip()[:80],
            })
    return hits


def find_d38999_insert_arrangements(text):
    """
    'D97 I 8 4' -> arrangement D97, service rating I, then up to four
    pin-count columns in FIXED COLUMN ORDER (22D, 20, 16, 12).

    This is the fragile part: the source table has columns that go BLANK
    for sizes that arrangement doesn't use, and flattened text loses
    which blank goes where. Confirm against the PDF, not this guess -
    that's exactly why every hit below is 'unverified_extraction'.
    """
    pattern = re.compile(
        r'^([A-J]\d{1,3})\s+([IM]{1,2})\s+((?:\d+\s*)+)$'
    )
    order = ["22D", "20", "16", "12"]
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        m = pattern.match(line.strip())
        if m:
            nums = [int(n) for n in m.group(3).split()]
            hits.append({
                "arrangement": m.group(1),
                "service_rating": m.group(2),
                "raw_numbers": nums,
                "column_order_ASSUMED": order,
                "source_line": lineno,
                "context": line.strip()[:80],
                "warning": ("Column position for these numbers is "
                           "ASSUMED, not extracted - verify against "
                           "the actual table, blanks shift columns."),
            })
    return hits


def find_wedgelocks(text):
    """
    Wedgelock designators. Three DIFFERENT patterns exist across families -
    this is exactly the kind of thing that bites you if you guess instead
    of extracting: DT uses W#P/W#S, DTM uses WM-#P/WM-#S, DTP uses
    WP-#P/WP-#S. A regex broad enough to catch all three will also need
    a human to sort which family each hit belongs to.
    """
    pattern = re.compile(r'\b(W[MP]?-?\d{1,2}[SP])\b')
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in pattern.finditer(line):
            hits.append({
                "designator": m.group(1),
                "source_line": lineno,
                "context": line.strip()[:80],
            })
    return hits


def find_contact_part_numbers(text):
    """
    Deutsch contact PNs: 0460-xxx-xx** (pin) / 0462-xxx-xx** (socket).
    The ** is a plating-code placeholder in the catalog itself, not an
    extraction failure - flag it so it isn't mistaken for one.
    """
    pattern = re.compile(r'\b(04(?:60|62)-\d{3}-\d{2}\*{0,2})\b')
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in pattern.finditer(line):
            gender = "pin" if m.group(1).startswith("0460") else "socket"
            hits.append({
                "pn": m.group(1),
                "gender": gender,
                "source_line": lineno,
                "context": line.strip()[:80],
            })
    return hits


def find_awg_ranges(text):
    """AWG wire ranges, e.g. '16-20 AWG' or '20 AWG (0.50 mm2)'."""
    pattern = re.compile(r'(\d{1,2})-(\d{1,2})\s*(?:AWG|\(mm)')
    hits = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in pattern.finditer(line):
            hits.append({
                "range": [int(m.group(1)), int(m.group(2))],
                "source_line": lineno,
                "context": line.strip()[:80],
            })
    return hits


def build_candidates(text, source_name):
    return {
        "_README": (
            "Every entry is unverified_extraction until a human confirms "
            "it against the real table. Regex matches text shape, not "
            "meaning - it doesn't know a housing PN from a document ID."
        ),
        "source": source_name,
        "housing_part_numbers": find_deutsch_part_numbers(text),
        "wedgelocks": find_wedgelocks(text),
        "contacts": find_contact_part_numbers(text),
        "awg_ranges": find_awg_ranges(text),
        "d38999_shell_types": find_d38999_shell_types(text),
        "d38999_insert_arrangements": find_d38999_insert_arrangements(text),
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    path = sys.argv[1]
    with open(path, encoding="utf-8", errors="replace") as f:
        text = f.read()

    candidates = build_candidates(text, source_name=path)

    print(f"\nEXTRACTED FROM: {path}")
    print("=" * 60)
    for key in ("housing_part_numbers", "wedgelocks", "contacts", "awg_ranges",
                "d38999_shell_types", "d38999_insert_arrangements"):
        items = candidates[key]
        print(f"\n{key}: {len(items)} candidates")
        seen = set()
        for item in items[:12]:
            ident = (item.get("pn") or item.get("designator")
                     or item.get("range") or item.get("arrangement")
                     or item.get("series_iii_type"))
            if str(ident) in seen:
                continue
            seen.add(str(ident))
            extra = ""
            if "raw_numbers" in item:
                extra = f"  raw={item['raw_numbers']}  ({item['service_rating']})"
            elif "description" in item:
                extra = f"  -> {item['description']}"
            print(f"  line {item['source_line']:>4}: {ident}{extra}")
        if len(items) > 12:
            print(f"  ... and {len(items) - 12} more")

    out_path = path.rsplit(".", 1)[0] + "_candidates.json"
    with open(out_path, "w") as f:
        json.dump(candidates, f, indent=2)
    print(f"\nFull candidate list written to {out_path}")
    print("Review it. Nothing here is verified until you check it against "
          "the actual table and move it into data.json yourself.\n")


if __name__ == "__main__":
    main()
