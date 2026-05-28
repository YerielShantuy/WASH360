"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  score: number;
}

export function WaterQualityChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0284C7" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="date"
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
          formatter={(v: number) => [`${v}`, "Quality Score"]}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#0284C7"
          strokeWidth={2.5}
          fill="url(#qualityGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
