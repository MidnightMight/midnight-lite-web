# Ride route-planner graph

`build.py` turns an OpenStreetMap extract plus elevation tiles into the graph the planner page
(`src/pages/tools/route-planner.astro`) loads: `public/data/pmd/seq-YYYYMMDD-v7.bin`, ~7 MB gzip. It keeps every way a
bicycle, e-bike or PMD may legally use in Queensland, and stores per edge a category, flags (one-way, bicycle contraflow,
unsealed, "no bicycles", guessed speed limit, lit) and climb/descent. The browser (`src/pmd/router.worker.js`) turns those
into per-mode costs, so the route options don't need a rebuild. Rules and categories are documented at the top of `build.py`.

Elevation: Geoscience Australia "DEM LiDAR 5m" (bare earth, CC BY 4.0), fetched at ~10 m by `fetch-dem.sh` into `dem5/`;
Copernicus GLO-30 (`dem/`, a surface model with trees and roofs) fills the gaps. The DEM rarely needs re-fetching.

Rebuild (every month or two, or after big path changes in OSM), on the NUC:

```sh
R=$PWD   # website repo
docker build -t pmd-osm tools/pmd-graph
mkdir -p /srv/pmd-route/osm /srv/pmd-route/out && cd /srv/pmd-route
curl -sSL -o osm/australia-latest.osm.pbf https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf
# first time only: elevation
#   (cd dem5 && for x in $(seq 152.3 0.1 153.5); do for y in $(seq -28.3 0.1 -26.9); do echo "$x $y"; done; done | xargs -P 2 -n 2 $R/tools/pmd-graph/fetch-dem.sh)
#   Copernicus: Copernicus_DSM_COG_10_{S27,S28,S29}_00_{E152,E153}_00_DEM.tif from copernicus-dem-30m.s3.amazonaws.com into dem/
docker run --rm -u 1000:1000 -v /srv/pmd-route:/w -v "$R/tools/pmd-graph":/t pmd-osm sh -c \
  'osmium extract -b 152.35,-28.27,153.56,-26.80 --strategy smart osm/australia-latest.osm.pbf -o osm/seq.osm.pbf --overwrite &&
   python3 /t/build.py osm/seq.osm.pbf dem5,dem out/graph.bin'
cp out/graph.bin "$R/public/data/pmd/seq-$(date +%Y%m%d)-v7.bin"
```

Then point `GRAPH` in `src/pages/tools/route-planner.astro` at the new file (with the new date) and delete the old one.
File names carry the date because `public/_headers` caches them for a year.

## Missing speed limits

Main roads with no `maxspeed` take the limit of the connected parts of the same road (highest wins), and are flagged as
guessed. Roads with no limit anywhere are treated as over 60 km/h, but PMDs may use them like other main roads, with a
warning, and the page offers a pre-filled email to report the limit. Reported limits go in `speed-limits.csv`
(name, lat, lon, radius_m, maxspeed: covers the untagged parts of that road within the radius); also add them to
OpenStreetMap if you've seen the sign, then the row can go after the next rebuild.
