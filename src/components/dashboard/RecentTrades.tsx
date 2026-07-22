import type { TradeRecord } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/types/trade";

interface RecentTradesProps {
  records: TradeRecord[];
  limit?: number;
}

export function RecentTrades({ records, limit = 10 }: RecentTradesProps) {
  const recent = [...records]
    .sort((a, b) => b.tradeTime.getTime() - a.tradeTime.getTime())
    .slice(0, limit);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-foreground">最近交易</h3>
      </div>
      <div className="divide-y divide-white/5">
        {recent.map((r, i) => (
          <div key={r.id + i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
            <Badge variant={r.type === "buy" ? "buy" : "sell"}>
              {r.type === "buy" ? "买入" : "卖出"}
            </Badge>
            <span className="flex-1 text-sm truncate">{r.commodityName}</span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {CATEGORY_LABELS[r.category]}
            </span>
            <span className={`text-sm font-mono font-medium ${r.type === "buy" ? "text-blue-400" : "text-orange-400"}`}>
              {r.type === "buy" ? "-" : "+"}{formatCurrency(r.priceYuan)}
            </span>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {r.tradeTimeStr.slice(0, 10)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
