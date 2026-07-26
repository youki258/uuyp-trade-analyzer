import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { MatchedPair } from "@/types/trade";
import { CHART } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

interface ProfitDistributionProps {
  pairs: MatchedPair[];
}

export function ProfitDistribution({ pairs }: ProfitDistributionProps) {
  const realized = pairs.filter((p) => p.status === "realized" && p.profitLoss !== null);

  if (realized.length === 0) {
    return (
      <div className="panel flex h-[300px] items-center justify-center p-6 text-sm text-muted-foreground">
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
    <div className="panel">
      <div className="border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">盈亏分布</h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis
              dataKey="range"
              stroke={CHART.axis}
              tick={{ ...CHART.tick, fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              stroke={CHART.axis}
              tick={CHART.tick}
              tickLine={false}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(v) => `${v} 笔`}
                  formatLabel={(label) => `区间: ¥${label}`}
                />
              }
            />
            <Bar dataKey="count" name="数量" radius={[4, 4, 0, 0]}>
              {buckets.map((entry, i) => (
                <Cell
                  key={i}
                  fill={parseFloat(entry.range) >= 0 ? CHART.profit : CHART.loss}
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
