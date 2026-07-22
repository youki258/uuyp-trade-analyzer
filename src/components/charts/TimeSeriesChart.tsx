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

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  height?: number;
}

export function TimeSeriesChart({ data, height = 350 }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-[350px] text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="buyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sellGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
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
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            itemStyle={{ color: "#E2E8F0" }}
            formatter={(value) => [`¥${Number(value ?? 0).toFixed(2)}`, ""]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
          />
          <Area
            type="monotone"
            dataKey="buyAmount"
            name="买入额"
            stroke="#60A5FA"
            fill="url(#buyGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="sellAmount"
            name="卖出额"
            stroke="#FB923C"
            fill="url(#sellGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="netAmount"
            name="净额"
            stroke="#00E5A0"
            fill="url(#netGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
