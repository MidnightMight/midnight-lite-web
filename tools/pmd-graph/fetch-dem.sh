#!/bin/sh
# GA DEM LiDAR 5m (2025) via WCS, 0.1 deg tiles at 0.0001 deg (~10 m), GDA94
x=$1; y=$2
f=lidar_${x}_${y}.tif
[ -s "$f" ] && file -b "$f" | grep -q TIFF && exit 0
x2=$(awk "BEGIN{printf \"%.1f\", $x + 0.1}"); y2=$(awk "BEGIN{printf \"%.1f\", $y + 0.1}")
for try in 1 2 3; do
  curl -s -m 300 -o "$f" "https://services.ga.gov.au/gis/services/DEM_LiDAR_5m_2025/MapServer/WCSServer?SERVICE=WCS&REQUEST=GetCoverage&VERSION=1.0.0&COVERAGE=1&CRS=EPSG:4283&BBOX=$x,$y,$x2,$y2&WIDTH=1000&HEIGHT=1000&FORMAT=GeoTIFF&INTERPOLATION=bilinear"
  file -b "$f" | grep -q TIFF && exit 0
  sleep 5
done
echo "FAILED $f"; rm -f "$f"
