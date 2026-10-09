#!/usr/bin/env python3
"""
Multi-family connector BOM builder.

Usage:
    python3 match.py DT04-4P 18
    python3 match.py DT04-4P 18 --populated 2
    python3 match.py M12-A4-MALE 22
    python3 match.py --list

HOW IT GENERALIZES
------------------
Nothing in this file knows what a Deutsch connector is.

Each family in data.json declares:
  match_on    - which attributes must be equal for two housings to mate
  accessories - which extra parts the family requires

So DT mates on [family, cavities]. M12 mates on [family, coding, poles].
D38999 mates on [family, series, shell_size, insert_arrangement, keying].
Same code, different declarations.

Adding a family = editing data.json. Never editing this file.

NO AI decides compatibility. It's attribute equality plus opposite gender.
"""

import json
import os
import sys

DATA_PATH = os.path.join(os.path.dirname(__file__), "data.json")

OPPOSITE = {"pin": "socket", "socket": "pin"}


def load():
    with open(DATA_PATH) as f:
        return json.load(f)


class Line:
    def __init__(self, qty, pn, desc, verification, basis=""):
        self.qty, self.pn, self.desc = qty, pn, desc
        self.verification, self.basis = verification, basis

    def __str__(self):
        flag = {"verified": "[OK ]", "inferred": "[INF]"}.get(
            self.verification, "[???]")
        out = f"{flag}  {self.qty:>3}x  {self.pn:<20} {self.desc}"
        if self.basis:
            out += f"\n              basis: {self.basis}"
        return out


def find_mate(data, target_pn):
    """
    Find the housing that mates with target_pn.

    Two housings mate when every attribute named in the family's match_on
    list is equal, AND their contact genders are opposite.
    """
    housings = data["housings"]
    target = housings[target_pn]
    rules = data["families"][target["family"]]
    keys = rules["match_on"]

    missing = [k for k in keys if k not in target]
    if missing:
        raise ValueError(
            f"{target_pn} is missing attribute(s) {missing} required by "
            f"family '{target['family']}'. Add them to data.json."
        )

    want_gender = OPPOSITE.get(target.get("gender"))
    candidates = []
    for pn, h in housings.items():
        if pn == target_pn:
            continue
        if h.get("gender") != want_gender:
            continue
        if all(h.get(k) == target.get(k) for k in keys):
            candidates.append(pn)

    basis = ", ".join(f"{k}={target.get(k)}" for k in keys)
    return candidates, basis


def build_bom(data, target_pn, wire_awg, populated=None):
    warnings, bom = [], []
    housings = data["housings"]

    if target_pn not in housings:
        raise KeyError(f"'{target_pn}' not in database. "
                       f"Run with --list to see what is.")

    target = housings[target_pn]
    fam_name = target["family"]
    fam = data["families"][fam_name]

    # --- gauge check (every family declares its own range) ---------------
    lo, hi = fam["awg_range"]
    if not (lo <= wire_awg <= hi):
        alts = [n for n, f in data["families"].items()
                if f["awg_range"][0] <= wire_awg <= f["awg_range"][1]]
        msg = (f"{wire_awg} AWG is outside the {fam_name} range "
               f"({lo}-{hi} AWG).")
        if alts:
            msg += f" Families that handle {wire_awg} AWG: {', '.join(alts)}"
        warnings.append(msg)

    # --- find the mate ---------------------------------------------------
    mates, basis = find_mate(data, target_pn)
    if not mates:
        raise ValueError(f"No mate found for {target_pn} (needs {basis}). "
                         f"It may just not be in data.json yet.")
    if len(mates) > 1:
        warnings.append(f"Multiple mates found for {target_pn}: "
                        f"{', '.join(mates)} - picking {mates[0]}")

    mate_pn = mates[0]
    mate = housings[mate_pn]
    bom.append(Line(1, mate_pn,
                    f"{fam_name} {mate.get('role','')}, {mate.get('gender','')} contacts",
                    mate["verification"], f"matched on {basis}"))

    cavities = target.get("cavities") or target.get("poles") or 0
    if populated is None:
        populated = cavities
    if cavities and populated > cavities:
        raise ValueError(f"{populated} wires won't fit in {cavities} positions")

    # --- accessories, driven entirely by the family declaration ----------
    for acc in fam.get("accessories", []):

        if acc == "wedgelock":
            wl = mate.get("wedgelock")
            if wl:
                bom.append(Line(1, wl, f"wedgelock for {mate_pn}",
                                mate["verification"],
                                "every housing in this family needs one"))
            else:
                warnings.append(f"{mate_pn} has no wedgelock listed in data.json")

        elif acc == "contacts":
            table = data.get("contacts", {}).get(fam_name)
            if not table:
                warnings.append(f"No contact data for {fam_name} - add it")
                continue
            gender = mate.get("gender")
            c = table[gender]
            bom.append(Line(populated, c["pn"],
                            f"{gender}, {c['awg_range'][0]}-{c['awg_range'][1]} AWG",
                            c["verification"], f"{mate_pn} takes {gender}s"))

        elif acc == "sealing_plugs":
            empty = cavities - populated
            if empty > 0:
                p = data.get("sealing_plugs", {}).get(fam_name)
                if p:
                    bom.append(Line(empty, p["pn"], "sealing plug, unused cavity",
                                    p["verification"],
                                    "open cavity = water ingress = field failure"))
                else:
                    warnings.append(f"No sealing plug listed for {fam_name}")

        else:
            warnings.append(
                f"Family {fam_name} declares accessory '{acc}' but the engine "
                f"has no handler for it yet.")

    if not fam.get("accessories"):
        note = fam.get("description", "")
        warnings.append(f"{fam_name} needs no loose accessories. {note}")

    return bom, warnings


def main():
    data = load()

    if "--list" in sys.argv or len(sys.argv) < 3:
        print(__doc__)
        for fam, f in data["families"].items():
            print(f"\n{fam}  - mates on {f['match_on']}, "
                  f"{f['awg_range'][0]}-{f['awg_range'][1]} AWG")
            for pn, h in data["housings"].items():
                if h["family"] == fam:
                    print(f"    {pn}")
        return

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    populated = None
    if "--populated" in sys.argv:
        populated = int(sys.argv[sys.argv.index("--populated") + 1])

    target_pn, wire_awg = args[0].upper(), int(args[1])

    try:
        bom, warnings = build_bom(data, target_pn, wire_awg, populated)
    except (KeyError, ValueError) as e:
        print(f"ERROR: {e}")
        return

    print(f"\nTO MATE WITH: {target_pn}   ({wire_awg} AWG)")
    print("=" * 64)
    for line in bom:
        print(line)
    print("=" * 64)
    for w in warnings:
        print(f"\n!! {w}")
    print("\n[OK ] verified   [INF] inferred - CHECK IT   [???] unknown")
    print("Nothing is verified yet. Check every line against the "
          "manufacturer catalog before ordering.\n")


if __name__ == "__main__":
    main()
