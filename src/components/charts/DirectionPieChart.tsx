import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

interface DirectionPieChartProps {
  buyCount: number;
  sellCount: number;
  buyAmount: number;
  sellAmount: number;
}

const COLORS = [CHART.buy, CHART.sell];

export function DirectionPieChart({ buyCount, sellCount, buyAmount, sellAmount }: DirectionPieChartProps) {
  const countData = [
    { name: "买入", value: buyCount, lineLabel: "买入" },
    { name: "卖出", value: sellCount, lineLabel: "卖出" },
  ];

  const amountData = [
    { name: "买入", value: Math.round(buyAmount * 100) / 100, lineLabel: "买入额" },
    { name: "卖出", value: Math.round(sellAmount * 100) / 100, lineLabel: "卖出额" },
  ];

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    name,
    percent = 0,
    fill,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    name?: string;
    percent?: number;
    fill?: string;
  }) => {
    const radian = Math.PI / 180;
    const cos = Math.cos(-((midAngle ?? 0) * radian));
    const sin = Math.sin(-((midAngle ?? 0) * radian));
    const sx = (cx ?? 0) + (outerRadius ?? 0) * cos;
    const sy = (cy ?? 0) + (outerRadius ?? 0) * sin;
    const mx = (cx ?? 0) + ((outerRadius ?? 0) + 18) * cos;
    const my = (cy ?? 0) + ((outerRadius ?? 0) + 18) * sin;
    const ex = mx + (cos >= 0 ? 18 : -18);
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill || "#8A8F98"} strokeWidth={1.2} fill="none" />
        <text
          x={ex + (cos >= 0 ? 4 : -4)}
          y={ey}
          fill={fill || "#8A8F98"}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize={11}
        >
          {`${name ?? ""} ${(percent * 100).toFixed(1)}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="panel">
      <div className="border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">买卖方向分布</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground">笔数</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={countData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {countData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatValue={(v) => `${v} 笔`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {countData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{item.lineLabel}</span>
                </div>
                <span className="tnum text-foreground">{item.value} 笔</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground">金额</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={amountData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {amountData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatValue={(v) => `¥${v.toFixed(2)}`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {amountData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{item.lineLabel}</span>
                </div>
                <span className="tnum text-foreground">¥{item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
