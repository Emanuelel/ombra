#!/usr/bin/env python3
"""
Fetch named food/drink POIs for the Barcelona bbox from Overture Maps (CDLA-Permissive-2.0,
free to store & ship) and write src/data/poi-overture.json — a build-only input for
build-terraces.ts's multi-source name join.

Overture 'places' is streamed via the `overturemaps` CLI (anonymous S3) as GeoJSON-seq;
we keep only named eat/drink venues and store {name, amenity, lat, lon}.

Run: npm run fetch-poi   (one-time; re-run to refresh names)
"""
import json, os, shutil, subprocess, sys

BBOX = "2.08,41.32,2.23,41.47"  # W,S,E,N — all of Barcelona
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "poi-overture.json")

# Match on category TOKENS (split on '_'), not substrings, so "pub" doesn't match "public".
KEEP = {
    "restaurant", "bar", "pub", "cafe", "coffee", "bistro", "brasserie", "gastropub", "brewpub",
    "pizzeria", "pizza", "creperie", "bakery", "brewery", "tapas", "eatery", "tavern", "cocktail",
    "diner", "steakhouse", "deli", "patisserie", "teahouse", "taproom", "izakaya", "cantina",
    "trattoria", "osteria", "taqueria", "cafeteria", "winery", "food", "cream", "beer", "wine",
    "juice", "pastry", "bagel", "ramen", "sushi", "bbq", "barbecue", "grill", "gelato", "creamery",
}

def is_food(cat: str) -> bool:
    if not cat:
        return False
    return any(tok in KEEP for tok in cat.split("_"))

def cli():
    return shutil.which("overturemaps") or os.path.expanduser("~/Library/Python/3.9/bin/overturemaps")

def main():
    cmd = [cli(), "download", "--bbox=" + BBOX, "-f", "geojsonseq", "--type=place"]
    print("Streaming Overture places for", BBOX, "…", flush=True)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, text=True)
    out, seen, kept = [], 0, 0
    for line in proc.stdout:
        line = line.strip().lstrip("\x1e").strip()
        if not line:
            continue
        try:
            f = json.loads(line)
        except json.JSONDecodeError:
            continue
        seen += 1
        p = f.get("properties", {})
        name = (p.get("names") or {}).get("primary")
        cat = (p.get("categories") or {}).get("primary")
        if not name or not is_food(cat):
            continue
        g = f.get("geometry", {})
        if g.get("type") != "Point":
            continue
        lon, lat = g["coordinates"][0], g["coordinates"][1]
        out.append({"name": name, "amenity": cat, "lat": lat, "lon": lon})
        kept += 1
        if seen % 20000 == 0:
            print(f"  scanned {seen}, kept {kept}", flush=True)
    proc.wait()
    with open(OUT, "w") as fh:
        json.dump(out, fh)
    print(f"✓ wrote poi-overture.json — {kept} food/drink venues (of {seen} scanned)")

if __name__ == "__main__":
    sys.exit(main())
