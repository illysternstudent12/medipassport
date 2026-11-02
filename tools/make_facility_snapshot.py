"""Build the demo facility snapshot from a raw Overpass API response.

Usage (from the project root):
    python tools/make_facility_snapshot.py path/to/overpass.json

The query used for the Barcelona demo (Park Guell, 3 km radius):
    [out:json][timeout:60];
    (nwr["amenity"~"^(hospital|clinic|doctors)$"](around:3000,41.41362,2.15297);
     nwr["healthcare"~"^(hospital|clinic|doctor|centre)$"](around:3000,41.41362,2.15297););
    out center tags;

Normalisation mirrors normalize() in js/emergency/facilities.js. Keep them in sync.
Data (c) OpenStreetMap contributors, ODbL 1.0.
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "demo-data" / "barcelona-facilities.json"


def type_of(t):
    a, h = t.get("amenity"), t.get("healthcare")
    hospital = a == "hospital" or h == "hospital"
    if hospital and t.get("emergency") == "yes":
        return "er"
    if hospital:
        return "hospital"
    if a == "clinic" or h in ("clinic", "centre"):
        return "clinic"
    return "doctor"


def address(t):
    street = " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x)
    city = " ".join(x for x in (t.get("addr:postcode"), t.get("addr:city")) if x)
    return ", ".join(x for x in (street, city) if x) or t.get("addr:full", "")


def main(src):
    raw = json.loads(Path(src).read_text(encoding="utf-8"))
    seen, out = set(), []
    for e in raw.get("elements", []):
        t = e.get("tags", {})
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lng = e.get("lon", e.get("center", {}).get("lon"))
        if not t.get("name") or lat is None:
            continue
        key = f"{t['name']}|{lat:.4f}|{lng:.4f}"
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "id": f"{e['type']}/{e['id']}", "name": t["name"], "type": type_of(t), "lat": lat, "lng": lng,
            "address": address(t),
            "phone": t.get("phone") or t.get("contact:phone", ""),
            "hours": t.get("opening_hours", ""),
            "website": t.get("website") or t.get("contact:website", ""),
            "speciality": [s.strip() for s in t.get("healthcare:speciality", "").split(";") if s.strip()],
            "operator": t.get("operator", ""),
            "emergency": t.get("emergency") == "yes",
            "wheelchair": t.get("wheelchair", ""),
            "network": "unverified",
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "captured": raw.get("osm3s", {}).get("timestamp_osm_base", ""),
        "center": {"lat": 41.41362, "lng": 2.15297, "radius_m": 3000, "label": "Park Guell, Barcelona"},
        "attribution": "Data (c) OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright",
        "facilities": out,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = {}
    for f in out:
        counts[f["type"]] = counts.get(f["type"], 0) + 1
    print(f"{len(out)} facilities -> {OUT.name}", counts)


if __name__ == "__main__":
    main(sys.argv[1])
