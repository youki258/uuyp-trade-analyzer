import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TimeSeriesPoint } from "@/types/trade";
import { CHART } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  height?: number;
}

export function TimeSeriesChart({ data, height = 400 }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="panel flex h-[400px] items-center justify-center p-6 text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis
            dataKey="date"
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
          <Bar
            dataKey="buyAmount"
            name="买入额"
            fill={CHART.buy}
            fillOpacity={0.85}
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            dataKey="sellAmount"
            name="卖出额"
            fill={CHART.sell}
            fillOpacity={0.85}
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
          />
          <Line
            type="monotone"
            dataKey="netAmount"
            name="净额"
            stroke={CHART.primary}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
