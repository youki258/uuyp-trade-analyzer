import type { DashboardStats } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProfitLossSummaryProps {
  stats: DashboardStats;
}

export function ProfitLossSummary({ stats }: ProfitLossSummaryProps) {
  const netPositive = stats.netProfitAfterFee >= 0;
  const realizedPositive = stats.realizedPL >= 0;

  return (
    <div className="panel p-6 lg:p-8">
      <div className="border-l-2 border-primary pl-4">
        <p className="text-xs text-muted-foreground">扣费后净盈亏</p>
        <p
          className={cn(
            "mt-2 text-hero tnum",
            netPositive ? "text-profit-light" : "text-loss-light"
          )}
        >
          {netPositive ? "+" : ""}
          {formatCurrency(stats.netProfitAfterFee)}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 border-t border-hairline pt-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-hairline">
        <div className="sm:pr-6">
          <p className="text-xs text-muted-foreground">已实现盈亏</p>
          <p
            className={cn(
              "mt-1.5 text-metric tnum",
              realizedPositive ? "text-profit-light" : "text-loss-light"
            )}
          >
            {realizedPositive ? "+" : ""}
            {formatCurrency(stats.realizedPL)}
          </p>
        </div>

        <div className="sm:px-6">
          <p className="text-xs text-muted-foreground">持仓成本估值</p>
          <p className="mt-1.5 text-metric tnum text-foreground">
            {formatCurrency(stats.holdingValue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            共 {stats.buyCount - stats.sellCount} 件持仓中
          </p>
        </div>

        <div className="sm:pl-6">
          <p className="text-xs text-muted-foreground">提现手续费合计</p>
          <p className="mt-1.5 text-metric tnum text-foreground">
            -{formatCurrency(stats.withdrawFeeTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
