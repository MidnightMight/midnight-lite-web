import React from "react";
import { Card, CardContent } from "@mui/material";
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

export default function LineChartCard({ data, xAxis, yAxes }) {
    return (
        <Card>
            <CardContent>
                <h2 className="text-xl font-semibold mb-4">Line Chart</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data}>
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
    );
}
