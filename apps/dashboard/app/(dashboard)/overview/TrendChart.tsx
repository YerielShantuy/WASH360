"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  day: string;
  quality: number;
  submissions: number;
}

export function TrendChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#64748B", fontFamily: "Inter, sans-serif" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748B", fontFamily: "Inter, sans-serif" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <Line
          type="monotone"
          dataKey="quality"
          stroke="#0284C7"
          strokeWidth={2.5}
          dot={false}
          name="Avg Quality"
        />
        <Line
          type="monotone"
          dataKey="submissions"
          stroke="#10B981"
          strokeWidth={2.5}
          dot={false}
          name="Submissions"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
