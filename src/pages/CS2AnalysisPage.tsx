import { useTradeData } from "@/hooks/useTradeData";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Crosshair, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CHART } from "@/components/charts/chartTheme";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

export function CS2AnalysisPage() {
  const { records, pairs, hasData } = useTradeData();
  const navigate = useNavigate();

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
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <EmptyState
          icon={<Crosshair className="h-8 w-8" />}
          title="暂无交易数据"
          description="上传悠悠有品导出的账单 CSV，或从服务器抓取账单后开始分析"
          action={
            <Button onClick={() => navigate("/")} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              上传账单文件
            </Button>
          }
        />
      </div>
    );
  }

  const metricItems = [
    { label: "武器皮肤交易", value: skinRecords.length, suffix: "笔" },
    { label: "已匹配盈亏", value: skinPairs.filter((p) => p.status === "realized").length, suffix: "对" },
    { label: "磨损等级种类", value: wearStats.length, suffix: "种" },
    { label: "武器类型种类", value: weaponStats.length, suffix: "种" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="CS2 场景分析" description="磨损等级 · 武器类型 · 专属深度洞察" />

      <div className="space-y-6">
        {/* 概览指标条带 */}
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-hairline xl:grid-cols-4">
            {metricItems.map((item) => (
              <div key={item.label} className="bg-panel px-5 py-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1.5 text-metric tnum text-foreground">
                  {item.value}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{item.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 磨损等级分析：饼图 5 + 柱图 7 */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="panel xl:col-span-5">
            <div className="border-b border-hairline px-5 py-4">
              <h3 className="text-sm font-medium text-foreground">磨损等级分布</h3>
            </div>
            {wearPieData.length > 0 ? (
              <div className="p-4">
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
                              stroke={(fill as string) || "#8A8F98"}
                              strokeWidth={1.2}
                              fill="none"
                            />
                            <text
                              x={ex + (cos >= 0 ? 4 : -4)}
                              y={ey}
                              fill={(fill as string) || "#8A8F98"}
                              textAnchor={textAnchor}
                              dominantBaseline="central"
                              fontSize={11}
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
                    <Tooltip content={<ChartTooltip formatValue={(v) => `${v} 笔`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                暂无磨损等级数据
              </div>
            )}
          </div>

          <div className="panel xl:col-span-7">
            <div className="border-b border-hairline px-5 py-4">
              <h3 className="text-sm font-medium text-foreground">磨损等级盈亏对比</h3>
            </div>
            {wearBarData.length > 0 ? (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={wearBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      dataKey="name"
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
                    <Bar
                      dataKey="盈亏"
                      radius={[4, 4, 0, 0]}
                    >
                      {wearBarData.map((_, index) => {
                        const wear = Object.entries(WEAR_LEVEL_LABELS).find(
                          ([, v]) => v === wearBarData[index].name
                        )?.[0] as WearLevel | undefined;
                        const color = wear ? WEAR_LEVEL_COLORS[wear] : CHART.primary;
                        return <Cell key={index} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                暂无磨损盈亏数据
              </div>
            )}
          </div>
        </div>

        {/* 磨损等级明细表（通栏） */}
        {wearStats.length > 0 && (
          <div className="panel overflow-hidden">
            <div className="border-b border-hairline px-5 py-4">
              <h3 className="text-sm font-medium text-foreground">磨损等级明细</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-inset/50 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">磨损等级</th>
                    <th className="px-4 py-2.5 text-right font-medium">交易数</th>
                    <th className="px-4 py-2.5 text-right font-medium">买入总额</th>
                    <th className="px-4 py-2.5 text-right font-medium">卖出总额</th>
                    <th className="px-4 py-2.5 text-right font-medium">平均价格</th>
                    <th className="px-4 py-2.5 text-right font-medium">盈亏</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {wearStats.map((w) => (
                    <tr key={w.wear} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: w.color }}
                          />
                          {w.label}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tnum">{w.count}</td>
                      <td className="px-4 py-2.5 text-right tnum">¥{w.buyAmount.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tnum">¥{w.sellAmount.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tnum">¥{w.avgPrice.toFixed(2)}</td>
                      <td
                        className={`px-4 py-2.5 text-right tnum font-medium ${
                          w.profitLoss >= 0 ? "text-profit-light" : "text-loss-light"
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

        {/* 武器类型：雷达图 5 + 明细表 7 */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="panel xl:col-span-5">
            <div className="border-b border-hairline px-5 py-4">
              <h3 className="text-sm font-medium text-foreground">武器类型盈亏分布</h3>
            </div>
            {weaponRadarData.length > 0 ? (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={weaponRadarData}>
                    <PolarGrid stroke={CHART.grid} />
                    <PolarAngleAxis
                      dataKey="type"
                      tick={CHART.tick}
                    />
                    <PolarRadiusAxis
                      tick={{ ...CHART.tick, fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="盈亏"
                      dataKey="盈亏"
                      stroke={CHART.primary}
                      fill={CHART.primary}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip
                      content={<ChartTooltip formatValue={(v) => `¥${v.toFixed(2)}`} />}
                    />
                    <Legend wrapperStyle={CHART.legend} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
                暂无武器类型数据
              </div>
            )}
          </div>

          {weaponStats.length > 0 && (
            <div className="panel overflow-hidden xl:col-span-7">
              <div className="border-b border-hairline px-5 py-4">
                <h3 className="text-sm font-medium text-foreground">武器类型明细</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-inset/50 text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium">武器类型</th>
                      <th className="px-4 py-2.5 text-right font-medium">交易数</th>
                      <th className="px-4 py-2.5 text-right font-medium">买入总额</th>
                      <th className="px-4 py-2.5 text-right font-medium">卖出总额</th>
                      <th className="px-4 py-2.5 text-right font-medium">盈亏</th>
                      <th className="px-4 py-2.5 text-right font-medium">平均持仓天数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {weaponStats.map((w) => (
                      <tr key={w.type} className="transition-colors hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5">{w.label}</td>
                        <td className="px-4 py-2.5 text-right tnum">{w.count}</td>
                        <td className="px-4 py-2.5 text-right tnum">¥{w.buyAmount.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tnum">¥{w.sellAmount.toFixed(2)}</td>
                        <td
                          className={`px-4 py-2.5 text-right tnum font-medium ${
                            w.profitLoss >= 0 ? "text-profit-light" : "text-loss-light"
                          }`}
                        >
                          {w.profitLoss >= 0 ? "+" : ""}¥{w.profitLoss.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right tnum">{w.avgHoldingDays}天</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
