import {
  AreaChart,
  Area,
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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          <Area
            type="monotone"
            dataKey="buyAmount"
            name="买入额"
            stroke={CHART.buy}
            fill={CHART.buy}
            fillOpacity={0.08}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="sellAmount"
            name="卖出额"
            stroke={CHART.sell}
            fill={CHART.sell}
            fillOpacity={0.08}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="netAmount"
            name="净额"
            stroke={CHART.primary}
            fill={CHART.primary}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
