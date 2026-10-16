import React from "react";
import { Card, CardContent } from "@mui/material";

export default function SvgMapCard({ gpsCoords, animatePath }) {
    if (gpsCoords.length <= 1) return null;

    const lats = gpsCoords.map((c) => c[1]);
    const lons = gpsCoords.map((c) => c[0]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const buffer = 0.02;

    const points = gpsCoords.map(([lon, lat]) => {
        const x = ((lon - minLon) / (maxLon - minLon + buffer)) * 100;
        const y = 100 - ((lat - minLat) / (maxLat - minLat + buffer)) * 100;
        return { x, y };
    });

    const polylineStyle = animatePath
        ? {
            stroke: "#007AFF",
            strokeWidth: 2,
            fill: "none",
            strokeDasharray: 500,
            strokeDashoffset: 1000,
            animation: "dash 4s linear forwards",
        }
        : { stroke: "#007AFF", strokeWidth: 2, fill: "none" };

    return (
        <Card>
            <CardContent>
                <h2 className="text-xl font-semibold mb-4">GPS Route Outline</h2>
                <svg
                    viewBox="-10 0 120 120"
                    className="w-full h-[40%] bg-gray-100 rounded-xl"
                >
                    <style>{`
            @keyframes dash {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
                    <polyline
                        style={polylineStyle}
                        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                    <circle cx={points[0].x} cy={points[0].y} r="2.5" fill="green" />
                    <circle
                        cx={points.at(-1).x}
                        cy={points.at(-1).y}
                        r="2.5"
                        fill="red"
                    />
                </svg>
            </CardContent>
        </Card>
    );
}
