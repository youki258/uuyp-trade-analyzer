import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TopItems } from "@/components/analysis/TopItems";
import { ProfitLossTable } from "@/components/analysis/ProfitLossTable";
import { InventoryStatus } from "@/components/analysis/InventoryStatus";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function ProfitAnalysisPage() {
  const { pairs, stats, categorySummaries, hasData } = useTradeData();
  const navigate = useNavigate();

  if (!hasData || !stats) {
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

  const realizedCount = pairs.filter((p) => p.status === "realized").length;
  const profitCount = pairs.filter((p) => p.status === "realized" && (p.profitLoss || 0) > 0).length;
  const lossCount = realizedCount - profitCount;
  const winRate = realizedCount > 0 ? profitCount / realizedCount : 0;

  const summaryItems = [
    {
      label: "已实现盈亏",
      value: `${stats.realizedPL >= 0 ? "+" : ""}${formatCurrency(stats.realizedPL)}`,
      color: stats.realizedPL >= 0 ? "text-profit-light" : "text-loss-light",
    },
    { label: "盈利笔数", value: `${profitCount}`, color: "text-profit-light" },
    { label: "亏损笔数", value: `${lossCount}`, color: "text-loss-light" },
    { label: "胜率", value: `${(winRate * 100).toFixed(1)}%`, color: "text-foreground" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="盈亏分析" description="FIFO 匹配的盈亏明细与排行" />

      <div className="space-y-6">
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-hairline xl:grid-cols-4">
            {summaryItems.map((item) => (
              <div key={item.label} className="bg-panel px-5 py-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-1.5 text-metric tnum ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProfitLossTable pairs={pairs} />
          </div>
          <div className="xl:col-span-5">
            <TopItems pairs={pairs} />
          </div>
        </div>

        <CategoryBarChart data={categorySummaries} />
        <InventoryStatus pairs={pairs} />
      </div>
    </div>
  );
}
