import type { MatchedPair } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";

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
    <div className="panel">
      <div className="border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">单品盈亏排行</h3>
      </div>
      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-hairline">
        <div className="px-5 py-4">
          <p className="mb-2 text-xs text-muted-foreground">最盈利 Top {limit}</p>
          <div>
            {topProfit.map((p, i) => (
              <div
                key={p.buyRecord.id + i}
                className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
              >
                <span className="w-6 text-xs text-muted-foreground tnum">{i + 1}</span>
                <span className="flex-1 truncate text-sm">{p.commodityName}</span>
                <span className="text-sm tnum text-profit-light">
                  +{formatCurrency(p.profitLoss!)}
                </span>
              </div>
            ))}
            {topProfit.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">暂无数据</p>
            )}
          </div>
        </div>

        <div className="border-t border-hairline px-5 py-4 lg:border-t-0">
          <p className="mb-2 text-xs text-muted-foreground">最亏损 Top {limit}</p>
          <div>
            {topLoss.map((p, i) => (
              <div
                key={p.buyRecord.id + i}
                className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
              >
                <span className="w-6 text-xs text-muted-foreground tnum">{i + 1}</span>
                <span className="flex-1 truncate text-sm">{p.commodityName}</span>
                <span className="text-sm tnum text-loss-light">
                  {formatCurrency(p.profitLoss!)}
                </span>
              </div>
            ))}
            {topLoss.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">暂无数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
