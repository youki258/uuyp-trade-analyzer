import { useTradeData } from "@/hooks/useTradeData";
import { useMemo } from "react";
import {
  calcWearStats,
  calcWeaponStats,
  WEAR_LEVEL_COLORS,
  WEAR_LEVEL_LABELS,
  type WearLevel,
} from "@/utils/cs2Analyzer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Shield, Swords, Target, Crosshair } from "lucide-react";

export function CS2AnalysisPage() {
  const { records, pairs, hasData } = useTradeData();

  const wearStats = useMemo(() => calcWearStats(records, pairs), [records, pairs]);
  const weaponStats = useMemo(() => calcWeaponStats(records, pairs), [records, pairs]);

  const skinRecords = useMemo(
    () => records.filter((r) => r.category === "weapon_skin"),
    [records]
  );

  const skinPairs = useMemo(
    () => pairs.filter((p) => p.buyRecord.category === "weapon_skin"),
    [pairs]
  );

  // 磨损等级分布饼图数据
  const wearPieData = useMemo(
    () =>
      wearStats.map((w) => ({
        name: w.label,
        value: w.count,
        color: w.color,
      })),
    [wearStats]
  );

  // 武器类型盈亏雷达图数据
  const weaponRadarData = useMemo(() => {
    if (weaponStats.length === 0) return [];
    return weaponStats.map((w) => ({
      type: w.label,
      盈亏: Math.round(w.profitLoss),
      交易量: Math.round((w.count / Math.max(...weaponStats.map((x) => x.count))) * 100),
    }));
  }, [weaponStats]);

  // 磨损等级盈亏柱状图
  const wearBarData = useMemo(
    () =>
      wearStats.map((w) => ({
        name: w.label,
        盈亏: w.profitLoss,
        交易数: w.count,
        平均价格: w.avgPrice,
      })),
    [wearStats]
  );

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <Crosshair className="w-16 h-16 text-primary/30" />
        <p className="text-muted-foreground text-lg">请先导入交易数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Swords className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">CS2 场景分析</h1>
          <p className="text-sm text-muted-foreground">
            磨损等级 · 武器类型 · 专属深度洞察
          </p>
        </div>
      </div>

      {/* 概览指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Swords className="w-5 h-5" />}
          label="武器皮肤交易"
          value={skinRecords.length}
          suffix="笔"
          color="text-blue-400"
        />
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label="已匹配盈亏"
          value={skinPairs.filter((p) => p.status === "realized").length}
          suffix="对"
          color="text-green-400"
        />
        <MetricCard
          icon={<Shield className="w-5 h-5" />}
          label="磨损等级种类"
          value={wearStats.length}
          suffix="种"
          color="text-yellow-400"
        />
        <MetricCard
          icon={<Swords className="w-5 h-5" />}
          label="武器类型种类"
          value={weaponStats.length}
          suffix="种"
          color="text-purple-400"
        />
      </div>

      {/* 磨损等级分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 磨损等级分布饼图 */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            磨损等级分布
          </h3>
          {wearPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={wearPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ cx, cy, midAngle, outerRadius, name, percent = 0, fill }) => {
                    const radian = Math.PI / 180;
                    const cos = Math.cos(-((midAngle ?? 0) * radian));
                    const sin = Math.sin(-((midAngle ?? 0) * radian));
                    const sx = (cx ?? 0) + (outerRadius ?? 0) * cos;
                    const sy = (cy ?? 0) + (outerRadius ?? 0) * sin;
                    const mx = (cx ?? 0) + ((outerRadius ?? 0) + 20) * cos;
                    const my = (cy ?? 0) + ((outerRadius ?? 0) + 20) * sin;
                    const ex = mx + (cos >= 0 ? 22 : -22);
                    const ey = my;
                    const textAnchor = cos >= 0 ? "start" : "end";

                    return (
                      <g>
                        <path
                          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                          stroke={(fill as string) || "#94A3B8"}
                          strokeWidth={1.2}
                          fill="none"
                        />
                        <text
                          x={ex + (cos >= 0 ? 4 : -4)}
                          y={ey}
                          fill={(fill as string) || "#E2E8F0"}
                          textAnchor={textAnchor}
                          dominantBaseline="central"
                          fontSize={13}
                          fontWeight={700}
                        >
                          {`${name ?? ""} ${(percent * 100).toFixed(1)}%`}
                        </text>
                      </g>
                    );
                  }}
                  labelLine={false}
                >
                  {wearPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1F2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                  }}
                  labelStyle={{ color: "#E2E8F0" }}
                  itemStyle={{ color: "#E2E8F0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              暂无磨损等级数据
            </div>
          )}
        </div>

        {/* 磨损等级盈亏柱状图 */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            磨损等级盈亏对比
          </h3>
          {wearBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wearBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94A3B8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(v) => `¥${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1F2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                  }}
                  labelStyle={{ color: "#E2E8F0" }}
                  itemStyle={{ color: "#E2E8F0" }}
                  formatter={(value, name) => {
                    if (name === "盈亏") {
                      const numeric = Number(value ?? 0);
                      return [`¥${numeric.toFixed(2)}`, name];
                    }
                    return [value, name];
                  }}
                />
                <Bar
                  dataKey="盈亏"
                  radius={[4, 4, 0, 0]}
                >
                  {wearBarData.map((_, index) => {
                    const wear = Object.entries(WEAR_LEVEL_LABELS).find(
                      ([, v]) => v === wearBarData[index].name
                    )?.[0] as WearLevel | undefined;
                    const color = wear ? WEAR_LEVEL_COLORS[wear] : "#6366F1";
                    return <Cell key={index} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              暂无磨损盈亏数据
            </div>
          )}
        </div>
      </div>

      {/* 磨损等级明细表 */}
      {wearStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4">磨损等级明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">磨损等级</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">交易数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">买入总额</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">卖出总额</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均价格</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {wearStats.map((w) => (
                  <tr key={w.wear} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: w.color }}
                        />
                        {w.label}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{w.count}</td>
                    <td className="text-right py-3 px-4">¥{w.buyAmount.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">¥{w.sellAmount.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">¥{w.avgPrice.toFixed(2)}</td>
                    <td
                      className={`text-right py-3 px-4 font-medium ${
                        w.profitLoss >= 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {w.profitLoss >= 0 ? "+" : ""}¥{w.profitLoss.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 武器类型 */}
      <div className="grid grid-cols-1 gap-6">
        {/* 武器类型盈亏雷达图 */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5 text-blue-400" />
            武器类型盈亏分布
          </h3>
          {weaponRadarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={weaponRadarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="type"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  tick={{ fill: "#94A3B8", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="盈亏"
                  dataKey="盈亏"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1F2E",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                  }}
                  labelStyle={{ color: "#E2E8F0" }}
                  itemStyle={{ color: "#E2E8F0" }}
                />
                <Legend wrapperStyle={{ color: "#E2E8F0" }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              暂无武器类型数据
            </div>
          )}
        </div>
      </div>

      {/* 武器类型明细表 */}
      {weaponStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4">武器类型明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">武器类型</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">交易数</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">买入总额</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">卖出总额</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">盈亏</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">平均持仓天数</th>
                </tr>
              </thead>
              <tbody>
                {weaponStats.map((w) => (
                  <tr key={w.type} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">{w.label}</td>
                    <td className="text-right py-3 px-4">{w.count}</td>
                    <td className="text-right py-3 px-4">¥{w.buyAmount.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">¥{w.sellAmount.toFixed(2)}</td>
                    <td
                      className={`text-right py-3 px-4 font-medium ${
                        w.profitLoss >= 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {w.profitLoss >= 0 ? "+" : ""}¥{w.profitLoss.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4">{w.avgHoldingDays}天</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** 指标卡片组件 */
function MetricCard({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  color: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
