import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DirectionPieChartProps {
  buyCount: number;
  sellCount: number;
  buyAmount: number;
  sellAmount: number;
}

const COLORS = ["#60A5FA", "#FB923C"];

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
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill || "#94A3B8"} strokeWidth={1.2} fill="none" />
        <text
          x={ex + (cos >= 0 ? 4 : -4)}
          y={ey}
          fill={fill || "#E2E8F0"}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fontSize={12}
          fontWeight={600}
        >
          {`${name ?? ""} ${(percent * 100).toFixed(1)}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">买卖方向分布</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground text-center mb-2">笔数</p>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#E2E8F0" }}
                itemStyle={{ color: "#E2E8F0" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {countData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span style={{ color: COLORS[i] }}>{item.lineLabel}</span>
                </div>
                <span className="text-muted-foreground">{item.value} 笔</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground text-center mb-2">金额</p>
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
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {amountData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span style={{ color: COLORS[i] }}>{item.lineLabel}</span>
                </div>
                <span className="text-muted-foreground">¥{item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
