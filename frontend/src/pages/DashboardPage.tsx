import { useNavigate } from "react-router-dom";
import { StatCards } from "@/components/dashboard/StatCards";
import { ProfitLossSummary } from "@/components/dashboard/ProfitLossSummary";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { DirectionPieChart } from "@/components/charts/DirectionPieChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { useTradeData } from "@/hooks/useTradeData";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function DashboardPage() {
  const { stats, records, hasData, isLoading } = useTradeData();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <p className="animate-pulse text-sm text-muted-foreground">正在加载数据...</p>
      </div>
    );
  }

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

  return (
    <div className="animate-fade-in">
      <PageHeader title="总览仪表盘" description="交易数据全局概览" />

      <div className="space-y-6">
        <StatCards stats={stats} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <ProfitLossSummary stats={stats} />
          </div>
          <div className="xl:col-span-5">
            <DirectionPieChart
              buyCount={stats.buyCount}
              sellCount={stats.sellCount}
              buyAmount={stats.totalBuy}
              sellAmount={stats.totalSell}
            />
          </div>
        </div>

        <RecentTrades records={records} limit={8} />
      </div>
    </div>
  );
}
