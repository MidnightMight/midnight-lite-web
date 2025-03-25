import React from "react";
import { Card, CardContent } from "@mui/material";

export default function DataPreviewCard({ csvData, headers }) {
    return (
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
    );
}
