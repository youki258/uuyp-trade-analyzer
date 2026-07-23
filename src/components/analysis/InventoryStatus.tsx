import type { MatchedPair } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/types/trade";

interface InventoryStatusProps {
  pairs: MatchedPair[];
}

export function InventoryStatus({ pairs }: InventoryStatusProps) {
  const holding = pairs.filter((p) => p.status === "holding");
  const totalCost = holding.reduce((s, p) => s + p.costPrice, 0);

  const grouped = new Map<string, { name: string; count: number; totalCost: number; category: string }>();
  for (const p of holding) {
    const key = p.templateId || p.commodityName;
    if (!grouped.has(key)) {
      grouped.set(key, { name: p.commodityName, count: 0, totalCost: 0, category: CATEGORY_LABELS[p.buyRecord.category] });
    }
    const g = grouped.get(key)!;
    g.count++;
    g.totalCost += p.costPrice;
  }

  const items = [...grouped.values()].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">持仓状态</h3>
        <p className="text-xs text-muted-foreground">
          共 {holding.length} 件 · 成本合计{" "}
          <span className="tnum text-foreground">{formatCurrency(totalCost)}</span>
        </p>
      </div>

      <div className="max-h-[300px] overflow-y-auto px-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-0"
          >
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{item.category}</span>
            <span className="flex-1 truncate text-sm">{item.name}</span>
            <span className="text-xs text-muted-foreground tnum">x{item.count}</span>
            <span className="text-sm tnum text-foreground">{formatCurrency(item.totalCost)}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">暂无持仓</p>
        )}
      </div>
    </div>
  );
}
