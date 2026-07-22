import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function TrendPage() {
  const { getTimeSeries, hasData } = useTradeData();
  const navigate = useNavigate();
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  if (!hasData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center space-y-4">
        <p className="text-muted-foreground text-lg">暂无数据</p>
        <Button onClick={() => navigate("/")} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          上传账单文件
        </Button>
      </div>
    );
  }

  const chartData = getTimeSeries(granularity);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">时间趋势</h1>
          <p className="text-sm text-muted-foreground mt-1">交易额与盈亏的时间变化</p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                granularity === g
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g === "day" ? "按日" : g === "week" ? "按周" : "按月"}
            </button>
          ))}
        </div>
      </div>

      <TimeSeriesChart data={chartData} height={400} />

      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-foreground">周期明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">周期</th>
                <th className="text-right px-4 py-3 font-medium">买入额</th>
                <th className="text-right px-4 py-3 font-medium">卖出额</th>
                <th className="text-right px-4 py-3 font-medium">净额</th>
                <th className="text-right px-4 py-3 font-medium">笔数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {chartData.slice().reverse().slice(0, 30).map((item) => (
                <tr key={item.date} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.buyAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.sellAmount)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${item.netAmount >= 0 ? "text-profit" : "text-loss"}`}>
                    {item.netAmount >= 0 ? "+" : ""}{formatCurrency(item.netAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
