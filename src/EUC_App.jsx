"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";

// Component imports
import UploadCard from "./components/UploadCard";
import LineChartCard from "./components/LineChartCard";
import SvgMapCard from "./components/SvgMapCard";
import LeafletMapCard from "./components/LeafletMapCard";
import DataPreviewCard from "./components/DataPreviewCard";


const UNIT_MAP = {
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

// main app

export default function CsvDashboard() {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [xAxis, setXAxis] = useState("datetime");
    const [yAxes, setYAxes] = useState(["speed"]);
    const [showOutline, setShowOutline] = useState(true);
    const [showLeaflet, setShowLeaflet] = useState(true);
    const [animatePath, setAnimatePath] = useState(false);
  
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;
  
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const formattedData = results.data
            .filter(row => row[xAxis] !== undefined)
            .map(row => {
              if (row.datetime) {
                row.datetime = dayjs(row.datetime).format("YYYY-MM-DD HH:mm:ss");
              }
              return row;
            });
  
          const keys = Object.keys(results.data[0] || {});
  
          setCsvData(formattedData);
          setHeaders(keys);
  
          console.log("CSV Headers:", keys);
          console.log("First 5 GPS rows:", formattedData.slice(0, 5).map(row => [row.gps_lat, row.gps_lon]));
        },
      });
    };
  
    const gpsAvailable = headers.includes("gps_lat") && headers.includes("gps_lon");
    const gpsCoords = csvData
      .map(row => [row.gps_lon, row.gps_lat])
      .filter(([lng, lat]) => typeof lng === "number" && typeof lat === "number");
  
    return (
      <div className="p-6 grid gap-6">
        <UploadCard
          handleFileUpload={handleFileUpload}
          showLeaflet={showLeaflet}
          showOutline={showOutline}
          animatePath={animatePath}
          setShowLeaflet={setShowLeaflet}
          setShowOutline={setShowOutline}
          setAnimatePath={setAnimatePath}
        />
  
        {headers.length > 0 && (
          <LineChartCard data={csvData} xAxis={xAxis} yAxes={yAxes} />
        )}
  
        {showOutline && gpsAvailable && (
          <SvgMapCard gpsCoords={gpsCoords} animatePath={animatePath} />
        )}
  
        {showLeaflet && gpsAvailable && (
          <LeafletMapCard gpsCoords={gpsCoords} />
        )}
  
        {csvData.length > 0 && (
          <DataPreviewCard csvData={csvData} headers={headers} />
        )}
      </div>
    );
  }