#!/usr/bin/env python3
"""
Requirements -> connector options, across every family.

    python3 select.py "8x16 4x20"
    python3 select.py "8x16 4x20" --mount panel
    python3 select.py "8x16 4x20" --family D38999

WHAT CHANGED FROM v1
--------------------
v1 assumed every cavity in a housing is identical. True for Deutsch, false
for D38999 - an insert arrangement can be 8 size-16 plus 4 size-20 in one
shell. So housings now declare a CAVITY PROFILE:

    DT04-12P          {"16": 12}          twelve size-16 cavities
    D38999/26WE6PN    {"16": 8, "20": 4}  mixed arrangement

Fitting a requirement is now bin-packing: assign each wire gauge to a
contact size that accepts it, without overrunning any bin.

v1 also ranked globally, so Deutsch crowded out everything else. Now it
shows the best option PER FAMILY so you can compare across them.

No model decides any of this. Bin-packing and range checks only.
"""

import json
import os
import re
import sys

DATA_PATH = os.path.join(os.path.dirname(__file__), "data.json")
FLAG = {"verified": "[OK ]", "inferred": "[INF]", "unknown": "[???]"}


def load():
    with open(DATA_PATH) as f:
        return json.load(f)


def parse_requirements(text):
    reqs = [(int(c), int(g))
            for c, g in re.findall(r"(\d+)\s*[xX@]\s*(\d+)", text)]
    if not reqs:
        raise ValueError("Format: '8x16 4x20' = 8 wires of 16 AWG, "
                         "4 wires of 20 AWG")
    return reqs


def sizes_accepting(data, awg):
    """Which contact sizes can terminate this wire gauge?"""
    out = []
    for size, spec in data["contact_sizes"].items():
        lo, hi = spec["awg_range"]
        if lo <= awg <= hi:
            out.append(size)
    # smallest contact that fits first - don't waste a size 12 on 20 AWG.
    # sizes are strings and not all numeric ("22D"), so pull the digits.
    def size_num(s):
        digits = "".join(ch for ch in s if ch.isdigit())
        return int(digits) if digits else 0
    return sorted(out, key=lambda s: -size_num(s))


def fit(data, profile, reqs):
    """
    Bin-pack wires into the housing's cavity profile.

    Returns (assignment, leftover) where assignment maps
    contact_size -> [(count, awg), ...], or (None, reason) if it won't fit.

    Greedy: hardest-to-place gauges first (fewest acceptable sizes),
    into the tightest-fitting size available.
    """
    remaining = {s: n for s, n in profile.items()}
    assignment = {}

    ordered = sorted(reqs, key=lambda r: len(sizes_accepting(data, r[1])))

    for count, awg in ordered:
        need = count
        for size in sizes_accepting(data, awg):
            if size not in remaining or remaining[size] <= 0:
                continue
            take = min(need, remaining[size])
            remaining[size] -= take
            assignment.setdefault(size, []).append((take, awg))
            need -= take
            if need == 0:
                break
        if need:
            have = ", ".join(f"{n}x size {s}" for s, n in profile.items())
            return None, (f"{need} more position(s) needed for {awg} AWG "
                          f"(housing has {have})")

    leftover = sum(v for v in remaining.values() if v > 0)
    return assignment, leftover


def find_options(data, reqs, mount=None, termination=None, family=None):
    options, rejections = [], []

    for pn, h in data["housings"].items():
        fam_name = h["family"]
        if family and fam_name != family:
            continue
        profile = h.get("cavity_profile")
        if not profile:
            continue
        if mount and h.get("mount") != mount:
            continue
        if termination and h.get("termination") != termination:
            continue

        assignment, result = fit(data, profile, reqs)
        if assignment is None:
            rejections.append((pn, fam_name, result))
            continue

        options.append({
            "pn": pn, "family": fam_name, "profile": profile,
            "assignment": assignment, "spare": result,
            "mount": h.get("mount"), "termination": h.get("termination"),
            "role": h.get("role"), "gender": h.get("gender"),
            "wedgelock": h.get("wedgelock"), "note": h.get("note"),
            "verification": h["verification"],
        })

    options.sort(key=lambda o: (o["spare"], o["pn"]))
    return options, rejections


def best_per_family(options, per_family=2):
    grouped = {}
    for o in options:
        grouped.setdefault(o["family"], []).append(o)
    return {f: v[:per_family] for f, v in grouped.items()}


def bom_for(data, opt):
    lines = [(1, opt["pn"],
              f"housing, {opt['role']}, {opt['mount']} mount, "
              f"{opt['termination']}", opt["verification"])]

    if opt["wedgelock"]:
        lines.append((1, opt["wedgelock"], "wedgelock (required)",
                      opt["verification"]))

    ctable = data.get("contacts", {}).get(opt["family"])
    for size, groups in sorted(opt["assignment"].items()):
        for count, awg in groups:
            if ctable:
                c = ctable[opt["gender"]]
                lines.append((count, c["pn"],
                              f"size {size} {opt['gender']}, for {awg} AWG",
                              c["verification"]))
            else:
                lines.append((count, f"<size {size} {opt['gender']} contact>",
                              f"for {awg} AWG - PN not in database yet",
                              "unknown"))

    if opt["spare"] > 0:
        p = data.get("sealing_plugs", {}).get(opt["family"])
        pn = p["pn"] if p else f"<{opt['family']} sealing plug>"
        ver = p["verification"] if p else "unknown"
        lines.append((opt["spare"], pn, "sealing plug, unused cavity", ver))

    return lines


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    argv = sys.argv[1:]
    opts = {}
    for key in ("mount", "termination", "family"):
        if f"--{key}" in argv:
            opts[key] = argv[argv.index(f"--{key}") + 1]
    text = " ".join(a for a in argv
                    if not a.startswith("--") and a not in opts.values())

    data = load()
    reqs = parse_requirements(text)
    options, rejections = find_options(data, reqs, **opts)

    total = sum(c for c, _ in reqs)
    print(f"\nREQUIREMENT: " + ",  ".join(f"{c} x {g} AWG" for c, g in reqs)
          + f"   ({total} positions)")
    for k, v in opts.items():
        print(f"             {k}: {v}")
    print("=" * 68)

    if not options:
        print("\nNothing fits. Why each was rejected:")
        for pn, fam, why in rejections[:6]:
            print(f"  {pn:<22} {why}")
        print("\nThis requirement may need two connectors.\n")
        return

    for fam, opts_in_fam in best_per_family(options).items():
        fam_desc = data["families"][fam].get("description", "")
        print(f"\n### {fam}  - {fam_desc}")
        for o in opts_in_fam:
            spare = f"{o['spare']} spare" if o["spare"] else "exact fit"
            prof = ", ".join(f"{n}x size {s}" for s, n in
                             sorted(o["profile"].items()))
            print(f"\n  {o['pn']}   ({prof}, {spare})")
            print(f"  {o['mount']} mount / {o['termination']}")
            if o["note"]:
                print(f"  NOTE: {o['note']}")
            for qty, pn, desc, ver in bom_for(data, o):
                print(f"    {FLAG.get(ver,'[???]')} {qty:>3}x  {pn:<24} {desc}")

    if rejections:
        print(f"\n{len(rejections)} housing(s) rejected. Examples:")
        for pn, fam, why in rejections[:3]:
            print(f"  {pn:<22} {why}")

    print("\n" + "=" * 68)
    print("STOCK: not wired up yet (Stage 3).")
    print("[OK ] verified  [INF] inferred - CHECK IT  [???] unknown\n")


if __name__ == "__main__":
    main()
