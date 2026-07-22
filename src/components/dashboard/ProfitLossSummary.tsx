import type { DashboardStats } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Clock, Receipt } from "lucide-react";

interface ProfitLossSummaryProps {
  stats: DashboardStats;
}

export function ProfitLossSummary({ stats }: ProfitLossSummaryProps) {
  const plPositive = stats.realizedPL >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass-card p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${plPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
          <TrendingUp className={`w-6 h-6 ${plPositive ? "text-emerald-400" : "text-red-400"}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">已实现盈亏</p>
          <p className={`text-2xl font-bold ${plPositive ? "text-profit" : "text-loss"}`}>
            {plPositive ? "+" : ""}{formatCurrency(stats.realizedPL)}
          </p>
        </div>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-blue-500/10">
          <Clock className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">持仓成本估值</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(stats.holdingValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            共 {stats.buyCount - stats.sellCount} 件持仓中
          </p>
        </div>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10">
          <Receipt className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">提现手续费合计</p>
          <p className="text-2xl font-bold text-amber-400">
            -{formatCurrency(stats.withdrawFeeTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            扣费后净盈亏: <span className={stats.netProfitAfterFee >= 0 ? "text-profit" : "text-loss"}>
              {formatCurrency(stats.netProfitAfterFee)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
