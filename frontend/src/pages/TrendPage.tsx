import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function TrendPage() {
  const { getTimeSeries, hasData } = useTradeData();
  const navigate = useNavigate();
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  if (!hasData) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <EmptyState
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

  const chartData = getTimeSeries(granularity);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="时间趋势"
        description="交易额与盈亏的时间变化"
        actions={
          <div className="flex items-center gap-0.5 rounded-md border border-hairline bg-inset p-0.5">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`h-7 rounded px-2.5 text-xs transition-colors ${
                  granularity === g
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g === "day" ? "按日" : g === "week" ? "按周" : "按月"}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6">
        <TimeSeriesChart data={chartData} height={420} />

        <div className="panel overflow-hidden">
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="text-sm font-medium text-foreground">周期明细</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-inset/50 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">周期</th>
                  <th className="px-4 py-2.5 text-right font-medium">买入额</th>
                  <th className="px-4 py-2.5 text-right font-medium">卖出额</th>
                  <th className="px-4 py-2.5 text-right font-medium">净额</th>
                  <th className="px-4 py-2.5 text-right font-medium">笔数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {chartData.slice().reverse().slice(0, 30).map((item) => (
                  <tr key={item.date} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5">{item.date}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatCurrency(item.buyAmount)}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatCurrency(item.sellAmount)}</td>
                    <td className={`px-4 py-2.5 text-right tnum font-medium ${item.netAmount >= 0 ? "text-profit-light" : "text-loss-light"}`}>
                      {item.netAmount >= 0 ? "+" : ""}{formatCurrency(item.netAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right tnum text-muted-foreground">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
