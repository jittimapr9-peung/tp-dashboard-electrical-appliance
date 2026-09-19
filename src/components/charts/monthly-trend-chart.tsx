"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  month: string;
  commission: number;
  revenue: number;
}

export function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => Number(value).toLocaleString("th-TH")} />
          <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Revenue" />
          <Line type="monotone" dataKey="commission" stroke="#16a34a" strokeWidth={2} dot={false} name="Commission" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
