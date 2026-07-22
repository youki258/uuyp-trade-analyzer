import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import type { CategorySummary } from "@/types/trade";

interface CategoryBarChartProps {
  data: CategorySummary[];
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-[300px] text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">分类交易额与盈亏</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            tickFormatter={(v) => `¥${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15,20,35,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelStyle={{ color: "#E2E8F0" }}
            itemStyle={{ color: "#E2E8F0" }}
            formatter={(value) => [`¥${Number(value ?? 0).toFixed(2)}`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="buyAmount" name="买入额" radius={[4, 4, 0, 0]} fill="#60A5FA" fillOpacity={0.9} />
          <Bar dataKey="sellAmount" name="卖出额" radius={[4, 4, 0, 0]} fill="#FB923C" fillOpacity={0.9} />
          <Bar dataKey="realizedPL" name="已实现盈亏" radius={[4, 4, 0, 0]} fill="#10B981">
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.realizedPL >= 0 ? "#10B981" : "#EF4444"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
