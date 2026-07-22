import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { MatchedPair } from "@/types/trade";

interface ProfitDistributionProps {
  pairs: MatchedPair[];
}

export function ProfitDistribution({ pairs }: ProfitDistributionProps) {
  const realized = pairs.filter((p) => p.status === "realized" && p.profitLoss !== null);

  if (realized.length === 0) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-[300px] text-muted-foreground">
        暂无已实现盈亏数据
      </div>
    );
  }

  const profits = realized.map((p) => p.profitLoss!);
  const min = Math.min(...profits);
  const max = Math.max(...profits);
  const range = max - min || 1;
  const bucketCount = 12;
  const bucketSize = range / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    range: `${(min + i * bucketSize).toFixed(0)}`,
    count: 0,
    label: `${(min + i * bucketSize).toFixed(0)}~${(min + (i + 1) * bucketSize).toFixed(0)}`,
  }));

  for (const p of profits) {
    const idx = Math.min(Math.floor((p - min) / bucketSize), bucketCount - 1);
    buckets[idx].count++;
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">盈亏分布</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="range"
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
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
            formatter={(value) => [`${Number(value ?? 0)} 笔`, "数量"]}
            labelFormatter={(label) => `区间: ¥${label}`}
          />
          <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
            {buckets.map((entry, i) => (
              <Cell
                key={i}
                fill={parseFloat(entry.range) >= 0 ? "#10B981" : "#EF4444"}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

