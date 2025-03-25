import React, { useEffect } from "react";
import { Card, CardContent } from "@mui/material";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    const bounds = coords.map(([lon, lat]) => [lat, lon]);
    map.fitBounds(bounds);
  }, [coords, map]);
  return null;
}

export default function LeafletMapCard({ gpsCoords }) {
  if (gpsCoords.length <= 1) return null;

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Leaflet Map</h2>
        <div style={{ height: "400px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
          <MapContainer
            center={[gpsCoords[0][1], gpsCoords[0][0]]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Polyline positions={gpsCoords.map(([lon, lat]) => [lat, lon])} color="blue" />
            <FitBounds coords={gpsCoords} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
