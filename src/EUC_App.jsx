"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";
import {
    Card,
    CardContent,
    TextField,
    FormControlLabel,
    Checkbox,
    Autocomplete,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Define units for display
export const UNIT_MAP = {
    speed: "km/h",
    speed_avg: "km/h",
    speed_max: "km/h",
    voltage: "V",
    current: "A",
    power: "W",
    battery: "%",
    temp: "°C",
    temp_motor: "°C",
    temp_batt: "°C",
    tilt: "°",
    roll: "°",
    gps_speed: "km/h",
    gps_alt: "m",
    distance: "m",
    distance_total: "m",
};

// Helper: FitBounds for Leaflet Map
function FitBounds({ coords }) {
    const map = useMap();
    React.useEffect(() => {
        if (coords.length > 1) {
            const bounds = coords.map(([lon, lat]) => [lat, lon]);
            map.fitBounds(bounds);
        }
    }, [coords, map]);
    return null;
}

export default function CsvDashboard() {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [xAxis, setXAxis] = useState("datetime");
    const [yAxes, setYAxes] = useState(["speed"]);
    // Instead of three separate booleans, we use one state to toggle between "map" and "svg"
    const [mapMode, setMapMode] = useState("map");

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                const formattedData = results.data
                    .filter((row) => row[xAxis] !== undefined)
                    .map((row) => {
                        if (row.datetime) {
                            row.datetime = dayjs(row.datetime).format("YYYY-MM-DD HH:mm:ss");
                        }
                        return row;
                    });

                const keys = Object.keys(results.data[0] || {});
                setCsvData(formattedData);
                setHeaders(keys);
            },
        });
    };

    const handleYAxisToggle = (value) => {
        setYAxes((prev) =>
            prev.includes(value) ? prev.filter((y) => y !== value) : [...prev, value]
        );
    };

    // Build GPS coordinates array
    const gpsAvailable =
        headers.includes("gps_lat") && headers.includes("gps_lon");
    const gpsCoords = csvData
        .map((row) => [row.gps_lon, row.gps_lat])
        .filter(
            ([lng, lat]) => typeof lng === "number" && typeof lat === "number"
        );

    return (
        <div className="flex p-4 gap-6">
            {/* Sidebar: Trip Stats */}
            {csvData.length > 0 && (
                <div className="w-64 flex-shrink-0 h-[90vh] overflow-y-auto border rounded-lg shadow p-4 bg-blue-100">
                    <h2 className="text-lg font-semibold mb-4">Trip Stats</h2>
                    <button 
                        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                        onClick={() => window.history.back()}
                    >
                        Go Back
                    </button>
                    <ul className="text-sm space-y-2">
                        <li>
                            <strong>Distance Traveled:</strong>{" "}
                            {csvData.at(-1)?.distance_total ?? "-"} m
                        </li>
                        <li>
                            <strong>Max Speed:</strong>{" "}
                            {Math.max(...csvData.map((r) => r.speed || 0))} km/h
                        </li>
                        <li>
                            <strong>Battery (Start → End):</strong>{" "}
                            {csvData[0]?.battery}% → {csvData.at(-1)?.battery}%
                        </li>
                        <li>
                            <strong>Power Avg:</strong>{" "}
                            {csvData.length > 0
                                ? Math.round(
                                    csvData.reduce((acc, r) => acc + (r.power || 0), 0) /
                                    csvData.length
                                )
                                : "-"}{" "}
                            W
                        </li>
                        <li>
                            <strong>Trip Duration:</strong>
                            <br />
                            {csvData[0]?.datetime} → {csvData.at(-1)?.datetime}
                        </li>
                    </ul>
                </div>
            )}

            {/* Main Content with horizontal buffer and small vertical gap */}
            <div className="flex-grow max-w-6xl mx-auto grid gap-6">
                <h1 className="text-3xl font-bold text-center mb-4">
                    Welcome to EUC-World Data Visualiser
                </h1>

                {/* File Upload Card */}
                <Card>
                    <CardContent>
                        <div className="flex justify-center">
                            <TextField
                                type="file"
                                inputProps={{ accept: ".csv" }}
                                onChange={handleFileUpload}
                                variant="outlined"
                                label="Upload CSV File"
                                fullWidth
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Axis Selectors */}
                {headers.length > 0 && (
                    <>
                        {/* X-Axis Selector (Single Select) */}
                        <Card>
                            <CardContent>
                                <Autocomplete
                                    options={headers}
                                    value={xAxis}
                                    onChange={(event, newValue) => {
                                        if (newValue) setXAxis(newValue);
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Select X Axis Data" variant="outlined" />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            {option} {UNIT_MAP[option] ? `(${UNIT_MAP[option]})` : ""}
                                        </li>
                                    )}
                                    clearOnEscape
                                />
                            </CardContent>
                        </Card>

                        {/* Y-Axis Selector (Multi Select with Pills) */}
                        <Card>
                            <CardContent>
                                <Autocomplete
                                    multiple
                                    options={headers}
                                    value={yAxes}
                                    onChange={(event, newValue) => setYAxes(newValue)}
                                    filterSelectedOptions
                                    renderInput={(params) => (
                                        <TextField {...params} label="Select Y Axis Data" variant="outlined" />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            {option} {UNIT_MAP[option] ? `(${UNIT_MAP[option]})` : ""}
                                        </li>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Line Chart */}
                {headers.length > 0 && (
                    <Card>
                        <CardContent>
                            <h2 className="text-xl font-semibold mb-4">Line Chart</h2>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={csvData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey={xAxis} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    {yAxes.map((key, i) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={`hsl(${(i * 50) % 360}, 70%, 50%)`}
                                            dot={false}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Map Toggle Control */}
                {gpsAvailable && gpsCoords.length > 1 && (
                    <Card>
                        <CardContent>
                            <ToggleButtonGroup
                                value={mapMode}
                                exclusive
                                onChange={(event, newMode) => {
                                    if (newMode !== null) {
                                        setMapMode(newMode);
                                    }
                                }}
                                fullWidth
                                color="primary"
                            >
                                <ToggleButton value="map">Map</ToggleButton>
                                <ToggleButton value="svg">SVG</ToggleButton>
                            </ToggleButtonGroup>
                        </CardContent>
                    </Card>
                )}

                {/* Map / SVG Section */}
                {mapMode === "map" && gpsAvailable && gpsCoords.length > 1 && (
                    <Card>
                        <CardContent>
                            <h2 className="text-xl font-semibold mb-4">Leaflet Map</h2>
                            <div
                                style={{
                                    height: "400px",
                                    width: "100%",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }}
                            >
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
                                    <Polyline
                                        positions={gpsCoords.map(([lon, lat]) => [lat, lon])}
                                        color="blue"
                                    />
                                    <FitBounds coords={gpsCoords} />
                                </MapContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {mapMode === "svg" && gpsAvailable && gpsCoords.length > 1 && (
                    <Card>
                        <CardContent>
                            <h2 className="text-xl font-semibold mb-4">SVG Route</h2>
                            <div className="overflow-hidden" style={{ height: "400px" }}>
                                <svg
                                    viewBox="-10 0 120 120"
                                    style={{
                                        transform: "scale(0.5)",
                                        transformOrigin: "top left"
                                    }}
                                    className="w-full h-full bg-gray-100 rounded-xl"
                                >
                                    <style>{`
            @keyframes dash {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
                                    {(() => {
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
                                        const polylineStyle = {
                                            stroke: "#007AFF",
                                            strokeWidth: 2,
                                            fill: "none",
                                            strokeDasharray: 500,
                                            strokeDashoffset: 1000,
                                            animation: "dash 4s linear infinite",
                                        };
                                        return (
                                            <>
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
                                            </>
                                        );
                                    })()}
                                </svg>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Data Preview */}
                {csvData.length > 0 && (
                    <Card>
                        <CardContent>
                            <h2 className="text-xl font-semibold mb-4">Data Preview</h2>
                            <div className="overflow-auto">
                                <table className="min-w-full text-sm text-left border">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {headers.slice(0, 10).map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-3 py-2 border-b font-medium whitespace-nowrap"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                {headers.slice(0, 10).map((h) => (
                                                    <td key={h} className="px-3 py-2 border-b whitespace-nowrap">
                                                        {row[h]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
