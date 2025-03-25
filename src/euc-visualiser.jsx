import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./euc.css";
import CsvDashboard from "./EUC_App.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <CsvDashboard />
    </StrictMode>
);
