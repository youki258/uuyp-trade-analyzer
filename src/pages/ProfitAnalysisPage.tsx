import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TopItems } from "@/components/analysis/TopItems";
import { ProfitLossTable } from "@/components/analysis/ProfitLossTable";
import { InventoryStatus } from "@/components/analysis/InventoryStatus";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function ProfitAnalysisPage() {
  const { pairs, stats, categorySummaries, hasData } = useTradeData();
  const navigate = useNavigate();

  if (!hasData || !stats) {
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

  const realizedCount = pairs.filter((p) => p.status === "realized").length;
  const profitCount = pairs.filter((p) => p.status === "realized" && (p.profitLoss || 0) > 0).length;
  const lossCount = realizedCount - profitCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">盈亏分析</h1>
        <p className="text-sm text-muted-foreground mt-1">FIFO 匹配的盈亏明细与排行</p>
      </div>

      <div className="glass-card p-4 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground">已实现盈亏</p>
          <p className={`text-xl font-bold ${stats.realizedPL >= 0 ? "text-profit" : "text-loss"}`}>
            {stats.realizedPL >= 0 ? "+" : ""}{formatCurrency(stats.realizedPL)}
          </p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="text-xs text-muted-foreground">盈利笔数</p>
          <p className="text-lg font-bold text-profit">{profitCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">亏损笔数</p>
          <p className="text-lg font-bold text-loss">{lossCount}</p>
        </div>
      </div>

      <TopItems pairs={pairs} />
      <CategoryBarChart data={categorySummaries} />
      <ProfitLossTable pairs={pairs} />
      <InventoryStatus pairs={pairs} />
    </div>
  );
}
