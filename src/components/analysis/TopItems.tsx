import type { MatchedPair } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TopItemsProps {
  pairs: MatchedPair[];
  limit?: number;
}

export function TopItems({ pairs, limit = 5 }: TopItemsProps) {
  const realized = pairs.filter((p) => p.status === "realized" && p.profitLoss !== null);
  const topProfit = realized
    .filter((p) => (p.profitLoss || 0) > 0)
    .sort((a, b) => (b.profitLoss || 0) - (a.profitLoss || 0))
    .slice(0, limit);
  const topLoss = realized
    .filter((p) => (p.profitLoss || 0) < 0)
    .sort((a, b) => (a.profitLoss || 0) - (b.profitLoss || 0))
    .slice(0, limit);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-profit" />
          <h3 className="text-sm font-semibold text-foreground">最赚钱 Top {limit}</h3>
        </div>
        <div className="space-y-2">
          {topProfit.map((p, i) => (
            <div
              key={p.buyRecord.id + i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs font-bold text-profit w-5">#{i + 1}</span>
              <span className="flex-1 text-sm truncate">{p.commodityName}</span>
              <span className="text-sm font-mono font-medium text-profit">
                +{formatCurrency(p.profitLoss!)}
              </span>
            </div>
          ))}
          {topProfit.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">暂无数据</p>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-loss" />
          <h3 className="text-sm font-semibold text-foreground">最亏损 Top {limit}</h3>
        </div>
        <div className="space-y-2">
          {topLoss.map((p, i) => (
            <div
              key={p.buyRecord.id + i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs font-bold text-loss w-5">#{i + 1}</span>
              <span className="flex-1 text-sm truncate">{p.commodityName}</span>
              <span className="text-sm font-mono font-medium text-loss">
                {formatCurrency(p.profitLoss!)}
              </span>
            </div>
          ))}
          {topLoss.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
