import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

export default function EventChart({ categories }) {
  const data = categories.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name,
    sold: c.sold,
    total: c.total,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <Tooltip />
          <Bar dataKey="sold" name="Vendidos" />
          <Bar dataKey="total" name="Total" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
