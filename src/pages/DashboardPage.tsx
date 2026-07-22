import { useNavigate } from "react-router-dom";
import { StatCards } from "@/components/dashboard/StatCards";
import { ProfitLossSummary } from "@/components/dashboard/ProfitLossSummary";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { DirectionPieChart } from "@/components/charts/DirectionPieChart";
import { useTradeData } from "@/hooks/useTradeData";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function DashboardPage() {
  const { stats, records, hasData } = useTradeData();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">总览仪表盘</h1>
        <p className="text-sm text-muted-foreground mt-1">交易数据全局概览</p>
      </div>

      <StatCards stats={stats} />
      <ProfitLossSummary stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DirectionPieChart
          buyCount={stats.buyCount}
          sellCount={stats.sellCount}
          buyAmount={stats.totalBuy}
          sellAmount={stats.totalSell}
        />
        <RecentTrades records={records} limit={8} />
      </div>
    </div>
  );
}
