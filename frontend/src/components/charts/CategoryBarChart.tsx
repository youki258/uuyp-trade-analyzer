import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import type { CategorySummary } from "@/types/trade";
import { CHART } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

interface CategoryBarChartProps {
  data: CategorySummary[];
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="panel flex h-[320px] items-center justify-center p-6 text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">分类交易额与盈亏</h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis
              dataKey="label"
              stroke={CHART.axis}
              tick={CHART.tick}
              tickLine={false}
            />
            <YAxis
              stroke={CHART.axis}
              tick={CHART.tick}
              tickLine={false}
              tickFormatter={(v) => `¥${v}`}
            />
            <Tooltip
              content={<ChartTooltip formatValue={(v) => `¥${v.toFixed(2)}`} />}
            />
            <Legend wrapperStyle={CHART.legend} />
            <Bar dataKey="buyAmount" name="买入额" radius={[4, 4, 0, 0]} fill={CHART.buy} fillOpacity={0.85} />
            <Bar dataKey="sellAmount" name="卖出额" radius={[4, 4, 0, 0]} fill={CHART.sell} fillOpacity={0.85} />
            <Bar dataKey="realizedPL" name="已实现盈亏" radius={[4, 4, 0, 0]} fill={CHART.profit}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.realizedPL >= 0 ? CHART.profit : CHART.loss}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
