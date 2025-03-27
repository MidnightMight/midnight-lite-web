import React from "react";
import { Card, CardContent, TextField, FormControlLabel, Checkbox } from "@mui/material";

export default function UploadCard({
    handleFileUpload,
    showLeaflet,
    showOutline,
    animatePath,
    setShowLeaflet,
    setShowOutline,
    setAnimatePath,
    gpsAvailable,
}) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <TextField
                    type="file"
                    inputProps={{ accept: ".csv,text/csv,application/vnd.ms-excel",}}
                    onChange={handleFileUpload}
                    variant="outlined"
                    label="Upload CSV File"
                    fullWidth
                />
                {gpsAvailable && (
                    <div className="flex flex-wrap gap-4 mt-4">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showLeaflet}
                                    onChange={() => setShowLeaflet(!showLeaflet)}
                                />
                            }
                            label="Show Leaflet Map"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showOutline}
                                    onChange={() => setShowOutline(!showOutline)}
                                />
                            }
                            label="Show SVG Outline"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={animatePath}
                                    onChange={() => setAnimatePath(!animatePath)}
                                />
                            }
                            label="Animate SVG Path"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
