#!/usr/bin/env python3
"""Build the route-planner graph (bicycles, e-bikes and PMDs) for SE Queensland from an OSM extract.

Rules (qld.gov.au, 2026):
  PMD (e-scooter, e-skateboard, EUC; "Rules for personal mobility devices", updated 26 Aug 2026)
    - paths (footpath, shared, separated, bicycle path): allowed unless a "no PMD" sign
    - roads and on-road bike lanes: only where the speed limit is 60 km/h or less
    - roads over 60 km/h: only physically separated bike lanes
    - one-way roads in the legal direction only
  Bicycle / e-bike ("Bicycle road rules and safety", updated 1 Jul 2026)
    - roads (any speed), bike lanes, footpaths and shared paths, unless signs prohibit bicycles
    - motorways only where OSM says bicycle=yes/designated (conservative)
    - one-way roads, except where bicycles are exempted (oneway:bicycle=no / contraflow lane)
  12 km/h on footpaths for PMDs and e-bikes (the browser applies speed limits for time estimates).
Each edge stores a category + flags + climb/descent; the browser turns those into per-mode costs, so options don't
need a rebuild. Ways no mode may use are left out.

Elevation: Geoscience Australia "DEM LiDAR 5m" (bare earth, CC BY 4.0) fetched at ~10 m by fetch-dem.sh, with
Copernicus GLO-30 (a surface model: trees and roofs included) only where there's no LiDAR. Bridges/tunnels are interpolated between their ends (a 30 m DEM
reads the river or hill under them), then each way's profile is smoothed over ~25 m before summing climb.

Usage (tools/pmd-graph/Dockerfile image):
  python3 build.py seq.osm.pbf dem5,dem out/graph.bin
"""
import csv, glob, gzip, json, math, os, sys
import numpy as np
import osmium
from osgeo import gdal

gdal.UseExceptions()

# --- edge categories (keep in sync with src/pmd/router.worker.js) ---
CAT = dict(
    CYCLEWAY=0,        # highway=cycleway / separated bikeway / road with cycleway=track
    SHARED=1,          # path or footway where bicycles are designated/allowed (shared path)
    FOOTPATH=2,        # footway / pedestrian / path
    ROAD_QUIET=3,      # living_street, residential, service, unclassified, <= 60 km/h
    ROAD_BIG=4,        # tertiary/secondary/primary/trunk, <= 60 km/h
    ROAD_LANE=5,       # road <= 60 km/h with an on-road bike lane
    CROSSING=6,        # footway=crossing / cycleway=crossing
    TRACK=7,           # track / unpaved path / bridleway
    SIDEWALK=8,        # road over 60 km/h with sidewalk=* tagged but not mapped separately (ride the footpath)
    ROAD_FAST=9,       # road over 60 km/h: bicycles only
    ROAD_FAST_LANE=10, # road over 60 km/h with a painted bike lane or shoulder: bicycles only
    FERRY=11,          # passenger ferry leg (CityCat, CityHopper, cross-river, Moggill, Hopo); wait column = boarding wait
)
# Ferries: Translink allows bikes, e-scooters and other PMDs on CityCats and ferries (space and crew permitting).
# Island, resort and tourist ferries are left out. Typical boarding wait in minutes (about half the headway):
FERRY_SKIP = ("stradbroke", "island", "moreton", "tangalooma", "couran", "kooringal", "mirimar", "coochiemudlo", "micat")


def ferry_wait(t):
    name = (t.get("name", "") + " " + t.get("operator", "")).lower()
    if any(k in name for k in FERRY_SKIP):
        return None
    if "moggill" in name:
        return 5
    if "hopo" in name:
        return 15
    if "rivercity" in name:
        return 10
    return None
F_ONEWAY = 1        # only from->to
F_UNPAVED = 2
F_ROUGH = 4         # smoothness bad / mtb trail / sac_scale
F_NOBIKE = 8        # bicycle=no on a path: illegal for bicycles, warning for PMDs
F_SPEED_GUESS = 16  # road speed limit not tagged, inferred from the road class
F_LIT = 32
F_CONTRA = 64       # one-way, but bicycles may ride both ways
F_DISMOUNT = 128
F_SIGNALS = 256    # crossing controlled by traffic lights
F_SPEED_UNKNOWN = 512  # main road with no speed limit anywhere in the data (PMDs: last resort, with a warning)    # bicycle=dismount (ferry gangways, campus courts): allowed on foot, pushing the bike/device

ROAD_LOCAL = {"living_street", "residential", "service", "unclassified", "road"}
ROAD_MAIN = {"tertiary", "tertiary_link", "secondary", "secondary_link", "primary", "primary_link", "trunk", "trunk_link"}
NEVER = {"construction", "proposed", "raceway", "bus_guideway", "busway", "corridor", "elevator", "platform", "steps",
         "via_ferrata", "escape", "abandoned", "disused"}
PAVED = {"asphalt", "concrete", "concrete:plates", "concrete:lanes", "paving_stones", "paved", "sett",
         "chipseal", "metal", "wood", "brick", "bricks", "rubber", "tartan", "unhewn_cobblestone", "cobblestone"}
SEMI = {"compacted", "fine_gravel"}
BAD_SMOOTH = {"bad", "very_bad", "horrible", "very_horrible", "impassable"}
NO = {"no", "private", "discouraged"}
YES = {"yes", "designated", "permissive"}
CW_KEYS = ("cycleway", "cycleway:left", "cycleway:right", "cycleway:both")


def tagged_speed(t):
    """Speed limit from the tags, or None. Per-direction limits count as their higher value."""
    vals = []
    for k in ("maxspeed", "maxspeed:forward", "maxspeed:backward"):
        try:
            vals.append(int(t.get(k, "").split()[0]))
        except (ValueError, IndexError):
            pass
    if "maxspeed" in t and vals:
        return vals[0]
    return max(vals) if vals else None


def speed(t, inferred=None):
    sp = tagged_speed(t)
    if sp is not None:
        return sp, False
    if inferred:
        return inferred   # (limit, guessed): from speed-limits.csv, or from the connected parts of the same road
    h = t.get("highway")
    if h in ROAD_LOCAL:
        return 50, True
    if h in ("tertiary", "tertiary_link"):
        return 60, True
    return 80, True   # secondary/primary/trunk with no tag: assume over 60 (PMDs kept off)


def classify(t, inferred=None):
    """Return (category, flags), or None if no mode may use this way."""
    h = t.get("highway")
    if not h and t.get("route") == "ferry":
        return (CAT["FERRY"], 0) if ferry_wait(t) is not None and t.get("bicycle") != "no" else None
    if h == "busway" and t.get("bicycle") in YES:
        return CAT["SHARED"], 0   # e.g. Eleanor Schonell (Green) Bridge: bus + bike/foot lanes
    if not h or h in NEVER or t.get("area") == "yes" or t.get("indoor") == "yes":
        return None
    if t.get("access") in NO and t.get("bicycle") not in YES and t.get("foot") not in YES:
        return None
    flags = 0
    s = t.get("surface", "")
    if s and s not in PAVED and s not in SEMI:
        flags |= F_UNPAVED
    if t.get("smoothness") in BAD_SMOOTH or "mtb:scale" in t or t.get("sac_scale", "hiking") != "hiking":
        flags |= F_ROUGH
    if t.get("lit") == "yes":
        flags |= F_LIT
    oneway = t.get("oneway") in ("yes", "1", "-1") or t.get("junction") in ("roundabout", "circular")

    if h == "cycleway":
        if oneway:
            flags |= F_ONEWAY
        if t.get("cycleway") == "crossing" and signalised(t):
            flags |= F_SIGNALS
        return (CAT["CROSSING"] if t.get("cycleway") == "crossing" else CAT["CYCLEWAY"]), flags
    if h in ("footway", "pedestrian", "path", "bridleway", "track"):
        if t.get("bicycle") == "no":
            flags |= F_NOBIKE
        elif t.get("bicycle") == "dismount":
            flags |= F_DISMOUNT
        if t.get("footway") == "crossing" or t.get("path") == "crossing":
            if signalised(t):
                flags |= F_SIGNALS
            return CAT["CROSSING"], flags
        if h in ("track", "bridleway") or (flags & F_UNPAVED and h == "path"):
            return CAT["TRACK"], flags
        if t.get("bicycle") in ("designated", "yes", "permissive") or t.get("segregated"):
            return CAT["SHARED"], flags
        return CAT["FOOTPATH"], flags

    motorway = h in ("motorway", "motorway_link")
    if motorway and t.get("bicycle") not in YES:
        return None
    if h not in ROAD_LOCAL and h not in ROAD_MAIN and not motorway:
        return None
    if h == "service" and (t.get("service") in ("driveway", "drive-through", "emergency_access") or t.get("access") in NO):
        return None
    if t.get("bicycle") in ("no", "use_sidepath"):
        return None   # signed no bicycles on a road: keep every mode off it (conservative for PMDs too)
    sp, guess = speed(t, inferred)
    if guess:
        flags |= F_SPEED_GUESS
        if not inferred and h in ROAD_MAIN and h not in ("tertiary", "tertiary_link"):
            flags |= F_SPEED_UNKNOWN
    if oneway:
        flags |= F_ONEWAY
        if t.get("oneway:bicycle") == "no" or any(str(t.get(k, "")).startswith("opposite") for k in CW_KEYS):
            flags |= F_CONTRA
    track = any(t.get(k) == "track" for k in CW_KEYS)
    lane = any(t.get(k) in ("lane", "shared_lane", "shoulder") for k in CW_KEYS) or t.get("shoulder") in ("yes", "both", "left")
    if track:
        return CAT["CYCLEWAY"], flags   # physically separated: fine for PMDs at any road speed
    if sp > 60 or motorway:
        if t.get("sidewalk") in ("both", "left", "right", "yes") or t.get("sidewalk:both") == "yes":
            return CAT["SIDEWALK"], flags & ~(F_ONEWAY | F_CONTRA)   # the footpath beside it is two-way
        return (CAT["ROAD_FAST_LANE"] if lane else CAT["ROAD_FAST"]), flags
    if lane:
        return CAT["ROAD_LANE"], flags
    return (CAT["ROAD_QUIET"] if h in ROAD_LOCAL else CAT["ROAD_BIG"]), flags


def signalised(t):
    """Traffic lights on this node, or a crossing way controlled by them."""
    return t.get("highway") == "traffic_signals" or t.get("crossing") == "traffic_signals" or t.get("crossing:signals") == "yes"


def is_bridge(t):
    return t.get("bridge") not in (None, "no") or t.get("tunnel") not in (None, "no") or t.get("man_made") == "bridge"


# Rest spots for breaks and for where Google Maps parts hand over (somewhere to pull off the path).
# Bit mask per spot; the browser merges spots that are close together.
POI = {("amenity", "drinking_water"): 1, ("amenity", "toilets"): 2, ("amenity", "shelter"): 4, ("amenity", "bench"): 8,
       ("leisure", "picnic_table"): 16, ("amenity", "cafe"): 32, ("amenity", "bicycle_repair_station"): 64}


def poi_mask(t):
    if t.get("access") in NO or (t.get("access") == "customers" and t.get("amenity") == "toilets"):
        return 0
    return sum(m for (k, v), m in POI.items() if t.get(k) == v)


class MainRoads(osmium.SimpleHandler):
    """First pass: main roads, so untagged parts can borrow the speed limit of the road they belong to."""

    def __init__(self):
        super().__init__()
        self.roads = {}   # way id -> (name, link, speed or None, first node, last node, (lat, lon) of the middle node)

    def way(self, w):
        h = w.tags.get("highway")
        if h in ROAD_MAIN and len(w.nodes) >= 2:
            mid = w.nodes[len(w.nodes) // 2].location
            self.roads[w.id] = (w.tags.get("name", ""), h.endswith("_link"), tagged_speed(w.tags), w.nodes[0].ref, w.nodes[-1].ref,
                                (mid.lat, mid.lon) if mid.valid() else None)


def overrides(path):
    """speed-limits.csv: limits people have reported for roads the map has none for. Columns: name, lat, lon,
    radius_m, maxspeed (one row covers the untagged parts of that road within radius_m of the point)."""
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return [(r["name"], float(r["lat"]), float(r["lon"]), float(r["radius_m"]), int(r["maxspeed"]))
                for r in csv.DictReader(line for line in f if not line.startswith("#"))]


def infer_speeds(src):
    """Way id -> (speed limit, guessed) for untagged main roads: reported limits from speed-limits.csv first, then
    spread along same-named connected parts (highest neighbour wins, to stay on the safe side for PMDs; flagged as
    guessed). Unnamed slip roads take the highest limit of the roads they join."""
    m = MainRoads()
    m.apply_file(src, locations=True, idx="flex_mem")
    reported = {}
    for name, la, lo, rad, sp in overrides(os.path.join(os.path.dirname(os.path.abspath(__file__)), "speed-limits.csv")):
        for wid, r in m.roads.items():
            if r[2] is None and r[0] == name and r[5] and hav(r[5], (la, lo)) <= rad:
                reported[wid] = sp
    at = {}
    for wid, (_, _, _, a, b, _) in m.roads.items():
        at.setdefault(a, []).append(wid)
        at.setdefault(b, []).append(wid)
    known = {wid: r[2] for wid, r in m.roads.items() if r[2] is not None}
    known.update(reported)
    todo = [wid for wid in m.roads if wid not in known]
    while True:
        found = {}
        for wid in todo:
            name, link, _, a, b, _ = m.roads[wid]
            nb = [known[o] for n in (a, b) for o in at[n] if o in known and (m.roads[o][0] == name if name else link)]
            if nb and (name or link):
                found[wid] = max(nb)
        if not found:
            break
        known.update(found)
        todo = [wid for wid in todo if wid not in found]
    out = {wid: (known[wid], wid not in reported) for wid, r in m.roads.items() if r[2] is None and wid in known}
    print("main roads", len(m.roads), "untagged", len(out) + len(todo), "reported", len(reported), "limit inferred", len(out) - len(reported))
    return out


class Ways(osmium.SimpleHandler):
    def __init__(self, inferred):
        super().__init__()
        self.inferred = inferred
        self.ways = []          # (cat, flags, bridge, [node ids], wait, name)
        self.uses = {}
        self.coords = {}
        self.pois = []          # (lat, lon, mask, name)
        self.signals = set()    # node ids with traffic lights (made into vertices so routes can stop there)

    def node(self, n):
        if len(n.tags) and signalised(n.tags):
            self.signals.add(n.id)
        m = poi_mask(n.tags) if len(n.tags) else 0
        if m and n.location.valid():
            self.pois.append((n.location.lat, n.location.lon, m, n.tags.get("name", "")))

    def way(self, w):
        m = poi_mask(w.tags) if "highway" not in w.tags else 0
        if m:   # toilet blocks, shelters etc. mapped as buildings: use the middle of the outline
            pts = [(n.location.lat, n.location.lon) for n in w.nodes if n.location.valid()]
            if pts:
                self.pois.append((sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts), m, w.tags.get("name", "")))
            return
        c = classify(w.tags, self.inferred.get(w.id))
        if not c:
            return
        ids = [n.ref for n in w.nodes]
        if len(ids) < 2:
            return
        for n in w.nodes:
            if n.location.valid():
                self.coords[n.ref] = (n.location.lat, n.location.lon)
        if w.tags.get("oneway") == "-1":
            ids.reverse()
        wait = ferry_wait(w.tags) if c[0] == CAT["FERRY"] else 0
        t = w.tags
        name = t.get("name") or t.get("ref") or ("CityCat / ferry" if c[0] == CAT["FERRY"] else "")
        self.ways.append((c[0], c[1], is_bridge(t) or c[0] == CAT["FERRY"], ids, wait, name))
        for i, n in enumerate(ids):
            self.uses[n] = self.uses.get(n, 0) + (2 if i in (0, len(ids) - 1) else 1) + (n in self.signals)


class DEM:
    """Bilinear sampling over GeoTIFF tiles. folders are in priority order: a point takes the first layer
    that has data there (GA LiDAR 5 m bare earth first, Copernicus GLO-30 where there's no LiDAR)."""
    def __init__(self, folders):
        self.layers = []
        for folder in folders.split(","):
            tiles = []
            for f in sorted(glob.glob(folder.rstrip("/") + "/*.tif")):
                ds = gdal.Open(f)
                x0, dx, _, y0, _, dy = ds.GetGeoTransform()
                band = ds.GetRasterBand(1)
                a = band.ReadAsArray().astype(np.float32)
                nd = band.GetNoDataValue()
                if nd is not None:
                    a[a == np.float32(nd)] = np.nan
                a[(a < -100) | (a > 2000)] = np.nan
                tiles.append((a, x0, dx, y0, dy))
            print("DEM", folder, len(tiles), "tiles")
            self.layers.append(tiles)

    def sample(self, lat, lon):
        lat = np.asarray(lat, np.float64); lon = np.asarray(lon, np.float64)
        out = np.full(lat.shape, np.nan, np.float32)
        for tiles in self.layers:
            for a, x0, dx, y0, dy in tiles:
                x1, y1 = x0 + dx * a.shape[1], y0 + dy * a.shape[0]
                m = np.isnan(out) & (lon >= x0) & (lon < x1) & (lat <= y0) & (lat > y1)
                if not m.any():
                    continue
                px = (lon[m] - x0) / dx - 0.5; py = (lat[m] - y0) / dy - 0.5
                i0 = np.clip(np.floor(px).astype(int), 0, a.shape[1] - 2); j0 = np.clip(np.floor(py).astype(int), 0, a.shape[0] - 2)
                fx = np.clip(px - i0, 0, 1); fy = np.clip(py - j0, 0, 1)
                out[m] = (a[j0, i0] * (1 - fx) * (1 - fy) + a[j0, i0 + 1] * fx * (1 - fy)
                          + a[j0 + 1, i0] * (1 - fx) * fy + a[j0 + 1, i0 + 1] * fx * fy)
            print("  sampled, still missing", int(np.isnan(out).sum()))
        return np.nan_to_num(out, nan=0.0)


def hav(a, b):
    la1, lo1 = map(math.radians, a); la2, lo2 = map(math.radians, b)
    d = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742000 * math.asin(math.sqrt(d))


def smooth(d, z, win=25.0):
    """Distance-weighted moving average of a way's elevation profile (window +-win metres)."""
    n = len(z)
    if n < 3:
        return z
    out = [0.0] * n
    j0 = 0
    for i in range(n):
        while d[i] - d[j0] > win:
            j0 += 1
        s = w = 0.0
        j = j0
        while j < n and d[j] - d[i] <= win:
            s += z[j]; w += 1; j += 1
        out[i] = s / w
    out[0], out[-1] = z[0], z[-1]   # keep junction heights exact so edges join up
    return out


def main(src, demdir, out):
    h = Ways(infer_speeds(src))
    h.apply_file(src, locations=True, idx="flex_mem")
    print("ways", len(h.ways), "nodes", len(h.coords))
    dem = DEM(demdir)
    ids = list(h.coords)
    zs = dem.sample([h.coords[n][0] for n in ids], [h.coords[n][1] for n in ids])
    elev = dict(zip(ids, zs.tolist()))
    # bridges and tunnels first: straight line between their ends; their interior nodes override the DEM everywhere
    fixed = {}
    for cat, flags, bridge, nids, wait, name in h.ways:
        nids = [n for n in nids if n in h.coords]
        if not bridge or len(nids) < 3:
            continue
        d = [0.0]
        for k in range(1, len(nids)):
            d.append(d[-1] + hav(h.coords[nids[k - 1]], h.coords[nids[k]]))
        za, zb = elev[nids[0]], elev[nids[-1]]
        for k in range(1, len(nids) - 1):
            fixed[nids[k]] = za + (zb - za) * d[k] / (d[-1] or 1)
    elev.update(fixed)

    names = {"": 0}
    vid, vlat, vlon, vz = {}, [], [], []
    def vert(n):
        if n not in vid:
            vid[n] = len(vlat); la, lo = h.coords[n]
            vlat.append(round(la * 1e6)); vlon.append(round(lo * 1e6)); vz.append(round(elev[n]))
        return vid[n]
    edges, geom = [], []
    for cat, flags, bridge, nids, wait, name in h.ways:
        nids = [n for n in nids if n in h.coords]
        if len(nids) < 2:
            continue
        d = [0.0]
        for k in range(1, len(nids)):
            d.append(d[-1] + hav(h.coords[nids[k - 1]], h.coords[nids[k]]))
        z = smooth(d, [elev[n] for n in nids])
        start = 0
        for i in range(1, len(nids)):
            if i == len(nids) - 1 or h.uses.get(nids[i], 0) >= 2:
                seg = nids[start:i + 1]
                a, b = vert(seg[0]), vert(seg[-1])
                if a != b:
                    up = down = 0.0
                    for k in range(start, i):
                        dz = z[k + 1] - z[k]
                        up += max(dz, 0); down += max(-dz, 0)
                    g0 = len(geom)
                    for n in seg[1:-1]:
                        la, lo = h.coords[n]; geom.append((round(la * 1e6), round(lo * 1e6)))
                    if cat == CAT["FERRY"]:
                        up = down = 0.0   # water: no climbing (the ends can still differ, e.g. pontoon vs bank)
                    edges.append((a, b, int((d[i] - d[start]) * 10 + 0.5), cat, flags, g0, len(seg) - 2,
                                  int(up * 10 + 0.5), int(down * 10 + 0.5), wait, names.setdefault(name, len(names))))
                start = i
    link_ferries(h, vid, vlat, vlon, edges, names)
    pois = near_paths(h, names)
    signals = sorted(vid[n] for n in h.signals if n in vid)
    print("vertices", len(vlat), "edges", len(edges), "geom pts", len(geom), "traffic lights", len(signals))
    write(out, vlat, vlon, vz, edges, geom, names, pois, signals)


def near_paths(h, names, reach_cells=1):
    """Keep rest spots within ~40 m of any node of a usable way (so they're actually beside the route)."""
    grid = set()
    for w in h.ways:
        for nid in w[3]:
            la, lo = h.coords.get(nid, (None, None))
            if la is not None:
                grid.add((int(la * 2500), int(lo * 2500)))   # ~44 m cells
    out = []
    for la, lo, m, nm in h.pois:
        cy, cx = int(la * 2500), int(lo * 2500)
        if any((cy + dy, cx + dx) in grid for dy in (-reach_cells, 0, reach_cells) for dx in (-reach_cells, 0, reach_cells)):
            out.append((round(la * 1e6), round(lo * 1e6), m, names.setdefault(nm, len(names))))
    print("rest spots", len(h.pois), "near paths", len(out))
    return sorted(out)


def link_ferries(h, vid, vlat, vlon, edges, names):
    """Ferry lines in OSM often end at a pontoon node that no path touches. Join each such end to the nearest
    path/road vertex within 150 m (pontoons hang off piers, which aren't paths) with a short footpath link (you walk the bike on), so the ferry is usable."""
    land = set()
    for e in edges:
        if e[3] != CAT["FERRY"]:
            land.add(e[0]); land.add(e[1])
    ends = {v for e in edges if e[3] == CAT["FERRY"] for v in (e[0], e[1]) if v not in land}
    grid = {}
    for v in land:
        grid.setdefault((vlat[v] // 1000, vlon[v] // 1000), []).append(v)   # ~110 m cells
    nm = names.setdefault("ferry terminal", len(names))
    linked = 0
    for v in ends:
        cy, cx = vlat[v] // 1000, vlon[v] // 1000
        best, bd = None, 150.0
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for u in grid.get((cy + dy, cx + dx), ()):
                    d = hav((vlat[v] / 1e6, vlon[v] / 1e6), (vlat[u] / 1e6, vlon[u] / 1e6))
                    if d < bd:
                        best, bd = u, d
        if best is not None:
            edges.append((best, v, int(bd * 10 + 0.5), CAT["FOOTPATH"], 0, 0, 0, 0, 0, 0, nm)); linked += 1
    print("ferry ends linked", linked, "of", len(ends))


def dp(pts, tol):
    """Douglas-Peucker on (lat,lon)*1e6 ints; tol in metres. Returns kept interior points."""
    if len(pts) < 3:
        return pts[1:-1]
    kx = math.cos(math.radians(pts[0][0] / 1e6)) * 0.111   # m per 1e-6 deg lon
    ky = 0.111
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop()
        ax, ay = pts[a][1] * kx, pts[a][0] * ky; bx, by = pts[b][1] * kx, pts[b][0] * ky
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i][1] * kx - ax, pts[i][0] * ky - ay
            t = max(0, min(1, (px * dx + py * dy) / L2))
            d = (px - t * dx) ** 2 + (py - t * dy) ** 2
            if d > best:
                best, bi = d, i
        if best > tol * tol:
            keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for i, p in enumerate(pts[1:-1], 1) if keep[i]]


def varints(vals, out):
    for v in vals:
        v = (v << 1) ^ (v >> 63)          # zigzag
        while v >= 0x80:
            out.append((v & 0x7F) | 0x80); v >>= 7
        out.append(v)


def write(out, vlat, vlon, vz, edges, geom, names, pois, signals):
    # spatial order: sort vertices by a 0.01 deg grid cell, then lon, so neighbours have close ids
    n = len(vlat)
    order = sorted(range(n), key=lambda i: (vlat[i] // 10000, vlon[i] // 10000, vlon[i], vlat[i]))
    new = [0] * n
    for k, i in enumerate(order):
        new[i] = k
    lat = [vlat[i] for i in order]; lon = [vlon[i] for i in order]; z = [vz[i] for i in order]
    E = []
    for a, b, L, cat, flags, g0, gn, up, down, wait, nm in edges:
        pts = [(vlat[a], vlon[a])] + geom[g0:g0 + gn] + [(vlat[b], vlon[b])]
        E.append((new[a], new[b], L, cat, flags, dp(pts, 1.5), up, down, wait, nm))
    E.sort(key=lambda e: (e[0], e[1]))
    buf = bytearray(b"PMD7")
    cols = [
        [lat[0]] + [lat[i] - lat[i - 1] for i in range(1, n)],
        [lon[0]] + [lon[i] - lon[i - 1] for i in range(1, n)],
        [z[0]] + [z[i] - z[i - 1] for i in range(1, n)],                 # vertex elevation, metres
        [E[0][0]] + [E[i][0] - E[i - 1][0] for i in range(1, len(E))],  # from (sorted)
        [e[1] - e[0] for e in E],                                        # to - from
        [(e[2] + 5) // 10 for e in E],                                   # length in m
        [e[3] | (e[4] << 4) for e in E],                                 # cat | flags<<4
        [e[6] for e in E],                                               # climb from->to, decimetres
        [e[7] for e in E],                                               # descent from->to, decimetres
        [e[8] for e in E],                                               # ferry boarding wait, minutes (0 = not a ferry)
        [e[9] for e in E],                                               # name index (0 = unnamed)
        [len(e[5]) for e in E],                                          # geom count
    ]
    g = []
    for e in E:
        pla, plo = lat[e[0]], lon[e[0]]
        for la, lo in e[5]:
            g += [la - pla, lo - plo]; pla, plo = la, lo
    cols.append(g)
    varints([n, len(E), len(g) // 2], buf)
    for c in cols:
        varints(c, buf)
    # name table: count, then (byte length, UTF-8) for each, in index order
    table = sorted(names, key=names.get)
    varints([len(table)], buf)
    for nm in table:
        b = nm.encode("utf-8"); varints([len(b)], buf); buf += b
    # rest spots: count, then lat/lon deltas (sorted by lat), type mask, name index
    varints([len(pois)], buf)
    varints([pois[0][0]] + [pois[i][0] - pois[i - 1][0] for i in range(1, len(pois))], buf)
    varints([pois[0][1]] + [pois[i][1] - pois[i - 1][1] for i in range(1, len(pois))], buf)
    varints([p[2] for p in pois], buf)
    varints([p[3] for p in pois], buf)
    # traffic lights: count, then vertex ids (sorted, deltas)
    sig = sorted(new[v] for v in signals)
    varints([len(sig)] + [sig[0]] + [sig[i] - sig[i - 1] for i in range(1, len(sig))], buf)
    with gzip.open(out, "wb", compresslevel=9) as f:
        f.write(bytes(buf))
    json.dump({"vertices": n, "edges": len(E), "geom": len(g) // 2, "raw_bytes": len(buf),
               "cats": {k: sum(1 for e in E if e[3] == v) for k, v in CAT.items()}, "signals": len(sig),
               "climb_km_total": round(sum(e[6] for e in E) / 10000, 1)},
              open(out + ".json", "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
