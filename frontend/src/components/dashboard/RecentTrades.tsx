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
    <div className="panel overflow-hidden">
      <div className="border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">最近交易</h3>
      </div>
      <div className="divide-y divide-hairline">
        {recent.map((r, i) => (
          <div key={r.id + i} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-white/[0.03]">
            <Badge variant={r.type === "buy" ? "buy" : "sell"}>
              {r.type === "buy" ? "买入" : "卖出"}
            </Badge>
            <span className="flex-1 truncate text-sm">{r.commodityName}</span>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {CATEGORY_LABELS[r.category]}
            </span>
            <span className={`text-sm tnum font-medium ${r.type === "buy" ? "text-blue-400" : "text-orange-400"}`}>
              {r.type === "buy" ? "-" : "+"}{formatCurrency(r.priceYuan)}
            </span>
            <span className="hidden text-xs text-muted-foreground tnum lg:inline">
              {r.tradeTimeStr.slice(0, 10)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
