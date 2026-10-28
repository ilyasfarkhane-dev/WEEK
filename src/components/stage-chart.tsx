"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StageChart({ data }: { data: { stage: string; count: number }[] }) {
  if (data.every((item) => item.count === 0)) {
    return <p className="text-sm text-muted">No projects in the selected filters.</p>;
  }
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ bottom: 70, left: 0, right: 8, top: 8 }}>
          <XAxis dataKey="stage" interval={0} angle={-30} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} width={32} />
          <Tooltip />
          <Bar dataKey="count" fill="#0c2340" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
